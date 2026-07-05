import type { dbClient } from "@kan/db/client";
import { ImapFlow } from "imapflow";
import type { AddressObject } from "mailparser";
import { simpleParser } from "mailparser";

import { createLogger } from "@kan/logger";

import type { WorkerConfig } from "./config";
import type { IncomingMessage } from "./processMessage";
import { processMessage } from "./processMessage";

const logger = createLogger("inbox-worker");

export function buildImapClient(config: WorkerConfig): ImapFlow {
  return new ImapFlow({
    host: config.imapHost,
    port: config.imapPort,
    secure: true,
    auth: { user: config.imapUser, pass: config.imapPassword },
    logger: false,
  });
}

export async function runOnce(
  db: dbClient,
  client: ImapFlow,
  opts: { requireFromMatch: boolean; maxPerHour: number },
): Promise<void> {
  const lock = await client.getMailboxLock("INBOX");
  try {
    // UID-based addressing: search/fetch/flag MUST all use UIDs consistently.
    // Plain SEARCH returns sequence numbers, which diverge from UIDs after any
    // expunge; feeding a seq number to UID STORE (messageFlagsAdd { uid: true })
    // would flag the wrong message, leaving the processed one unseen (infinite
    // reprocessing + duplicates) and silently marking an unrelated message seen.
    const uids = await client.search({ seen: false }, { uid: true });
    if (!uids || uids.length === 0) return;

    for (const uid of uids) {
      const message = await client.fetchOne(uid, { source: true }, { uid: true });
      if (!message || !message.source) {
        // Poison message: no fetchable source. Mark \Seen anyway so it does
        // not resurface on every search({ seen: false }) as an infinite retry.
        logger.warn({ uid }, "email dropped: no source; marking seen to avoid retry loop");
        await markSeen(client, uid);
        continue;
      }

      let parsed: Awaited<ReturnType<typeof simpleParser>>;
      try {
        parsed = await simpleParser(message.source);
      } catch (error) {
        // Unparseable MIME fails identically on every retry (permanent). If we
        // let it throw, the loop aborts, \Seen is never set, and the same UID
        // resurfaces first on the next poll — an infinite loop that wedges the
        // shared mailbox for ALL users behind one malformed email. Dead-letter
        // it: mark \Seen + log. NOTE: transient/DB failures are deliberately
        // NOT caught here — those must propagate to the backoff loop and retry.
        logger.warn(
          { uid, error },
          "email dropped: unparseable MIME; marking seen to avoid wedging inbox",
        );
        await markSeen(client, uid);
        continue;
      }

      const incoming: IncomingMessage = {
        to: addressText(parsed.to),
        deliveredTo: firstHeader(parsed.headers.get("delivered-to")),
        xOriginalTo: firstHeader(parsed.headers.get("x-original-to")),
        from: addressText(parsed.from),
        subject: parsed.subject ?? null,
        text: parsed.text ?? null,
        html: typeof parsed.html === "string" ? parsed.html : null,
        messageId: parsed.messageId ?? null,
        date: parsed.date ?? null,
      };

      const result = await processMessage(db, incoming, opts);
      if (result.status === "created") {
        logger.info({ uid, publicId: result.publicId }, "inbox item created");
      } else {
        logger.warn({ uid, reason: result.reason }, "email dropped");
      }

      // Idempotency: her işlenen mesaj (oluşturulmuş VEYA düşürülmüş) okundu işaretlenir.
      await markSeen(client, uid);
    }
  } finally {
    lock.release();
  }
}

// messageFlagsAdd resolves false when the store did not apply the flag. If we
// ignore that, the message stays unseen and gets reprocessed next poll (a
// duplicate item). We cannot force it, but a warning makes the cause visible
// instead of surfacing later as a mystery duplicate.
async function markSeen(client: ImapFlow, uid: number): Promise<void> {
  const ok = await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
  if (!ok) {
    logger.warn(
      { uid },
      "failed to set \\Seen flag; message may be reprocessed on next poll",
    );
  }
}

function addressText(
  addr: AddressObject | AddressObject[] | undefined,
): string | null {
  if (!addr) return null;
  if (Array.isArray(addr)) return addr.map((a) => a.text).join(", ") || null;
  return addr.text;
}

function firstHeader(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  // mailparser parses address-type headers (e.g. Delivered-To) into an
  // AddressObject { value, html, text } rather than a raw string, so the plain
  // string checks above miss it and the header is lost. Pull the .text form,
  // which parseRecipientToken scans for the inbox+<token>@ address.
  if (
    typeof value === "object" &&
    value !== null &&
    "text" in value &&
    typeof (value as { text: unknown }).text === "string"
  ) {
    return (value as { text: string }).text;
  }
  return null;
}

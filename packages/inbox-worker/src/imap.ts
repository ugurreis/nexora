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
    const uids = await client.search({ seen: false });
    if (!uids || uids.length === 0) return;

    for (const uid of uids) {
      const message = await client.fetchOne(uid, { source: true });
      if (!message || !message.source) continue;

      const parsed = await simpleParser(message.source);
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
      await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
    }
  } finally {
    lock.release();
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
  return null;
}

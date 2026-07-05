import type { dbClient } from "@kan/db/client";
import * as inboxRepo from "@kan/db/repository/inboxItem.repo";
import * as userRepo from "@kan/db/repository/user.repo";

import {
  buildDescription,
  buildTitle,
  extractEmail,
  parseRecipientToken,
} from "./parse";

export interface IncomingMessage {
  to?: string | null;
  deliveredTo?: string | null;
  xOriginalTo?: string | null;
  from?: string | null;
  subject?: string | null;
  text?: string | null;
  html?: string | null;
  messageId?: string | null;
  date?: Date | null;
}

export type ProcessResult =
  | { status: "created"; publicId: string }
  | { status: "dropped"; reason: string };

const ONE_HOUR_MS = 60 * 60 * 1000;

export async function processMessage(
  db: dbClient,
  msg: IncomingMessage,
  opts: { requireFromMatch: boolean; maxPerHour: number },
): Promise<ProcessResult> {
  const token = parseRecipientToken(msg);
  if (!token) return { status: "dropped", reason: "no-token" };

  const user = await userRepo.getByInboxEmailToken(db, token);
  if (!user) return { status: "dropped", reason: "unknown-token" };

  if (opts.requireFromMatch) {
    const from = extractEmail(msg.from);
    if (!from || from.toLowerCase() !== user.email.toLowerCase())
      return { status: "dropped", reason: "from-mismatch" };
  }

  const since = new Date(Date.now() - ONE_HOUR_MS);
  const recent = await inboxRepo.countCreatedSince(db, user.id, since);
  if (recent >= opts.maxPerHour)
    return { status: "dropped", reason: "rate-limited" };

  const created = await inboxRepo.create(db, {
    userId: user.id,
    title: buildTitle(msg.subject),
    description: buildDescription({ text: msg.text, html: msg.html }),
    source: "email",
    sourceMeta: JSON.stringify({
      from: msg.from ?? null,
      messageId: msg.messageId ?? null,
      receivedAt: (msg.date ?? new Date()).toISOString(),
    }),
  });

  if (!created) return { status: "dropped", reason: "create-failed" };
  return { status: "created", publicId: created.publicId };
}

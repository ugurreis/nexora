import type { dbClient } from "@kan/db/client";
import * as telegramLinkRepo from "@kan/db/repository/telegramLink.repo";

type LinkResult =
  | "linked"
  | "invalid-token"
  | "chat-already-linked-to-another-user";

// Postgres unique_violation error code.
const UNIQUE_VIOLATION = "23505";

export async function handleStart(
  db: dbClient,
  input: { chatId: bigint; token: string },
): Promise<LinkResult> {
  const consumed = await telegramLinkRepo.consumeLinkToken(db, input.token);
  if (!consumed) return "invalid-token";

  try {
    await telegramLinkRepo.upsertLink(db, {
      userId: consumed.userId,
      telegramChatId: input.chatId,
    });
    return "linked";
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: unknown }).code === UNIQUE_VIOLATION
    ) {
      return "chat-already-linked-to-another-user";
    }
    throw error;
  }
}

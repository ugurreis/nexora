import { and, eq, isNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { telegramLinks, telegramPendingTaskBatches } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const getLinkByUserId = async (db: dbClient, userId: string) => {
  return db.query.telegramLinks.findFirst({
    columns: { telegramChatId: true },
    where: eq(telegramLinks.userId, userId),
  });
};

export const getLinkByChatId = async (
  db: dbClient,
  telegramChatId: bigint,
) => {
  return db.query.telegramLinks.findFirst({
    columns: { userId: true },
    where: eq(telegramLinks.telegramChatId, telegramChatId),
  });
};

export const upsertLink = async (
  db: dbClient,
  input: { userId: string; telegramChatId: bigint },
) => {
  const [result] = await db
    .insert(telegramLinks)
    .values({
      publicId: generateUID(),
      userId: input.userId,
      telegramChatId: input.telegramChatId,
    })
    .onConflictDoUpdate({
      target: telegramLinks.userId,
      set: { telegramChatId: input.telegramChatId },
    })
    .returning({ publicId: telegramLinks.publicId });

  return result;
};

export const deleteByUserId = async (db: dbClient, userId: string) => {
  const [result] = await db
    .delete(telegramLinks)
    .where(eq(telegramLinks.userId, userId))
    .returning({ publicId: telegramLinks.publicId });

  return result;
};

export const createPendingBatch = async (
  db: dbClient,
  input: { userId: string; payload: string; expiresAt: Date },
) => {
  const [result] = await db
    .insert(telegramPendingTaskBatches)
    .values({
      publicId: generateUID(),
      userId: input.userId,
      payload: input.payload,
      expiresAt: input.expiresAt,
    })
    .returning({ publicId: telegramPendingTaskBatches.publicId });

  return result;
};

export const getPendingBatch = async (db: dbClient, publicId: string) => {
  return db.query.telegramPendingTaskBatches.findFirst({
    where: eq(telegramPendingTaskBatches.publicId, publicId),
  });
};

export const consumePendingBatch = async (db: dbClient, publicId: string) => {
  const [result] = await db
    .update(telegramPendingTaskBatches)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(telegramPendingTaskBatches.publicId, publicId),
        isNull(telegramPendingTaskBatches.consumedAt),
      ),
    )
    .returning({
      userId: telegramPendingTaskBatches.userId,
      payload: telegramPendingTaskBatches.payload,
      expiresAt: telegramPendingTaskBatches.expiresAt,
    });

  return result;
};

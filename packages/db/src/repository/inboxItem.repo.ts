import { and, count, desc, eq, gte, isNull } from "drizzle-orm";

import type { dbClient, Transaction } from "@kan/db/client";
import type { InboxSource } from "@kan/db/schema";
import { inboxItems } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const create = async (
  db: dbClient,
  input: {
    userId: string;
    title: string;
    description?: string | null;
    dueDate?: Date | null;
    source?: InboxSource;
    sourceMeta?: string | null;
  },
) => {
  const [result] = await db
    .insert(inboxItems)
    .values({
      publicId: generateUID(),
      userId: input.userId,
      title: input.title,
      description: input.description ?? null,
      dueDate: input.dueDate ?? null,
      source: input.source ?? "manual",
      sourceMeta: input.sourceMeta ?? null,
    })
    .returning({
      id: inboxItems.id,
      publicId: inboxItems.publicId,
      title: inboxItems.title,
      description: inboxItems.description,
      dueDate: inboxItems.dueDate,
      source: inboxItems.source,
      createdAt: inboxItems.createdAt,
    });

  return result;
};

export const getAllByUser = async (db: dbClient, userId: string) => {
  return db.query.inboxItems.findMany({
    columns: {
      publicId: true,
      title: true,
      description: true,
      dueDate: true,
      source: true,
      createdAt: true,
    },
    where: and(eq(inboxItems.userId, userId), isNull(inboxItems.deletedAt)),
    orderBy: [desc(inboxItems.createdAt)],
  });
};

export const getByPublicId = async (db: dbClient, publicId: string) => {
  return db.query.inboxItems.findFirst({
    where: and(
      eq(inboxItems.publicId, publicId),
      isNull(inboxItems.deletedAt),
    ),
  });
};

export const update = async (
  db: dbClient,
  input: {
    publicId: string;
    userId: string;
    title?: string;
    description?: string | null;
    dueDate?: Date | null;
  },
) => {
  const [result] = await db
    .update(inboxItems)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(inboxItems.publicId, input.publicId),
        eq(inboxItems.userId, input.userId),
        isNull(inboxItems.deletedAt),
      ),
    )
    .returning({ publicId: inboxItems.publicId });

  return result;
};

export const softDelete = async (
  db: dbClient | Transaction,
  input: { publicId: string; userId: string; sourceMeta?: string },
) => {
  const [result] = await db
    .update(inboxItems)
    .set({
      deletedAt: new Date(),
      ...(input.sourceMeta !== undefined
        ? { sourceMeta: input.sourceMeta }
        : {}),
    })
    .where(
      and(
        eq(inboxItems.publicId, input.publicId),
        eq(inboxItems.userId, input.userId),
        isNull(inboxItems.deletedAt),
      ),
    )
    .returning({ id: inboxItems.id, publicId: inboxItems.publicId });

  return result;
};

export const countCreatedSince = async (
  db: dbClient,
  userId: string,
  since: Date,
) => {
  const [row] = await db
    .select({ count: count() })
    .from(inboxItems)
    .where(
      and(eq(inboxItems.userId, userId), gte(inboxItems.createdAt, since)),
    );

  return row?.count ?? 0;
};

import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const telegramLinks = pgTable("telegram_link", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  publicId: varchar("publicId", { length: 12 }).notNull().unique(),
  userId: uuid("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  telegramChatId: bigint("telegramChatId", { mode: "bigint" })
    .notNull()
    .unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}).enableRLS();

export const telegramLinksRelations = relations(telegramLinks, ({ one }) => ({
  user: one(users, {
    fields: [telegramLinks.userId],
    references: [users.id],
    relationName: "telegramLinkUser",
  }),
}));

export const telegramPendingTaskBatches = pgTable(
  "telegram_pending_task_batch",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    publicId: varchar("publicId", { length: 12 }).notNull().unique(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    payload: text("payload").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    consumedAt: timestamp("consumedAt"),
  },
).enableRLS();

export const telegramPendingTaskBatchesRelations = relations(
  telegramPendingTaskBatches,
  ({ one }) => ({
    user: one(users, {
      fields: [telegramPendingTaskBatches.userId],
      references: [users.id],
      relationName: "telegramPendingTaskBatchUser",
    }),
  }),
);

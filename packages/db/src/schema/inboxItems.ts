import { relations } from "drizzle-orm";
import {
  bigserial,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const inboxSources = ["manual", "email", "telegram"] as const;
export type InboxSource = (typeof inboxSources)[number];
export const inboxSourceEnum = pgEnum("inbox_source", inboxSources);

export const inboxItems = pgTable(
  "inbox_item",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    publicId: varchar("publicId", { length: 12 }).notNull().unique(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 512 }).notNull(),
    description: text("description"),
    dueDate: timestamp("dueDate"),
    source: inboxSourceEnum("source").notNull().default("manual"),
    sourceMeta: text("sourceMeta"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt"),
    deletedAt: timestamp("deletedAt"),
  },
  (table) => [
    index("inbox_item_user_deleted_idx").on(table.userId, table.deletedAt),
    index("inbox_item_user_created_idx").on(table.userId, table.createdAt),
  ],
).enableRLS();

export const inboxItemsRelations = relations(inboxItems, ({ one }) => ({
  user: one(users, {
    fields: [inboxItems.userId],
    references: [users.id],
    relationName: "inboxItemUser",
  }),
}));

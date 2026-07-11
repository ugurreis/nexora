import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { boards } from "./boards";
import { labels } from "./labels";
import { lists } from "./lists";
import { users } from "./users";
import { workspaceMembers } from "./workspaces";

export const automationTriggerTypes = ["card.moved_to_list"] as const;
export type AutomationTriggerType = (typeof automationTriggerTypes)[number];
export const automationTriggerTypeEnum = pgEnum(
  "automation_trigger_type",
  automationTriggerTypes,
);

export const automationActionTypes = [
  "card.add_label",
  "card.assign_member",
] as const;
export type AutomationActionType = (typeof automationActionTypes)[number];
export const automationActionTypeEnum = pgEnum(
  "automation_action_type",
  automationActionTypes,
);

export const boardAutomations = pgTable(
  "board_automations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    publicId: varchar("publicId", { length: 12 }).notNull().unique(),
    boardId: bigint("boardId", { mode: "number" })
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    triggerType: automationTriggerTypeEnum("triggerType").notNull(),
    triggerListId: bigint("triggerListId", { mode: "number" })
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    actionType: automationActionTypeEnum("actionType").notNull(),
    actionLabelId: bigint("actionLabelId", { mode: "number" }).references(
      () => labels.id,
      { onDelete: "cascade" },
    ),
    actionWorkspaceMemberId: bigint("actionWorkspaceMemberId", {
      mode: "number",
    }).references(() => workspaceMembers.id, { onDelete: "cascade" }),
    active: boolean("active").notNull().default(true),
    createdBy: uuid("createdBy")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt"),
  },
  (table) => [
    index("board_automations_board_trigger_idx").on(
      table.boardId,
      table.triggerListId,
    ),
  ],
).enableRLS();

export const boardAutomationsRelations = relations(
  boardAutomations,
  ({ one }) => ({
    board: one(boards, {
      fields: [boardAutomations.boardId],
      references: [boards.id],
      relationName: "boardAutomationsBoard",
    }),
    triggerList: one(lists, {
      fields: [boardAutomations.triggerListId],
      references: [lists.id],
      relationName: "boardAutomationsTriggerList",
    }),
    actionLabel: one(labels, {
      fields: [boardAutomations.actionLabelId],
      references: [labels.id],
      relationName: "boardAutomationsActionLabel",
    }),
    actionMember: one(workspaceMembers, {
      fields: [boardAutomations.actionWorkspaceMemberId],
      references: [workspaceMembers.id],
      relationName: "boardAutomationsActionMember",
    }),
    createdByUser: one(users, {
      fields: [boardAutomations.createdBy],
      references: [users.id],
      relationName: "boardAutomationsCreatedByUser",
    }),
  }),
);

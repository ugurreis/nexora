import { and, eq } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { boardAutomations } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

import type {
  AutomationActionType,
  AutomationTriggerType,
} from "../schema/boardAutomations";

export const create = async (
  db: dbClient,
  input: {
    boardId: number;
    name: string;
    triggerType: AutomationTriggerType;
    triggerListId: number;
    actionType: AutomationActionType;
    actionLabelId?: number;
    actionWorkspaceMemberId?: number;
    createdBy: string;
  },
) => {
  const [automation] = await db
    .insert(boardAutomations)
    .values({
      publicId: generateUID(),
      boardId: input.boardId,
      name: input.name,
      triggerType: input.triggerType,
      triggerListId: input.triggerListId,
      actionType: input.actionType,
      actionLabelId: input.actionLabelId,
      actionWorkspaceMemberId: input.actionWorkspaceMemberId,
      createdBy: input.createdBy,
    })
    .returning({
      publicId: boardAutomations.publicId,
    });

  return automation ?? null;
};

export const getByPublicId = (db: dbClient, automationPublicId: string) => {
  return db.query.boardAutomations.findFirst({
    columns: {
      id: true,
      publicId: true,
      boardId: true,
    },
    where: eq(boardAutomations.publicId, automationPublicId),
  });
};

export const getAllByBoardId = (db: dbClient, boardId: number) => {
  return db.query.boardAutomations.findMany({
    columns: {
      publicId: true,
      name: true,
      triggerType: true,
      actionType: true,
      active: true,
      createdAt: true,
    },
    with: {
      triggerList: { columns: { publicId: true, name: true } },
      actionLabel: { columns: { publicId: true, name: true, colourCode: true } },
      actionMember: {
        columns: { publicId: true },
        with: { user: { columns: { name: true } } },
      },
    },
    where: eq(boardAutomations.boardId, boardId),
  });
};

/** Hot-path lookup used by the automation runner — active rules only. */
export const getActiveByBoardAndTriggerListId = (
  db: dbClient,
  boardId: number,
  triggerListId: number,
) => {
  return db.query.boardAutomations.findMany({
    columns: {
      publicId: true,
      actionType: true,
      actionLabelId: true,
      actionWorkspaceMemberId: true,
      createdBy: true,
    },
    where: and(
      eq(boardAutomations.boardId, boardId),
      eq(boardAutomations.triggerListId, triggerListId),
      eq(boardAutomations.active, true),
    ),
  });
};

export const hardDelete = (db: dbClient, automationPublicId: string) => {
  return db
    .delete(boardAutomations)
    .where(eq(boardAutomations.publicId, automationPublicId));
};

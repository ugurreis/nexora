import type { dbClient } from "@kan/db/client";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as inboxItemRepo from "@kan/db/repository/inboxItem.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as telegramLinkRepo from "@kan/db/repository/telegramLink.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import type { ResolvedTask } from "./resolveAndPersist";

type BatchStatus = "expired" | "already-consumed" | "confirmed" | "cancelled";

async function consumeOrStatus(
  db: dbClient,
  batchPublicId: string,
): Promise<
  | { ok: true; userId: string; resolved: ResolvedTask[] }
  | { ok: false; status: BatchStatus }
> {
  const consumed = await telegramLinkRepo.consumePendingBatch(db, batchPublicId);
  if (!consumed) return { ok: false, status: "already-consumed" };
  if (consumed.expiresAt.getTime() < Date.now())
    return { ok: false, status: "expired" };

  return {
    ok: true,
    userId: consumed.userId,
    resolved: JSON.parse(consumed.payload) as ResolvedTask[],
  };
}

export async function cancelBatch(
  db: dbClient,
  batchPublicId: string,
): Promise<{ status: BatchStatus }> {
  const result = await consumeOrStatus(db, batchPublicId);
  if (!result.ok) return { status: result.status };
  return { status: "cancelled" };
}

export async function confirmBatch(
  db: dbClient,
  batchPublicId: string,
): Promise<{ status: BatchStatus; createdCount: number; inboxCount: number }> {
  const result = await consumeOrStatus(db, batchPublicId);
  if (!result.ok) return { status: result.status, createdCount: 0, inboxCount: 0 };

  let createdCount = 0;
  let inboxCount = 0;

  for (const task of result.resolved) {
    const dueDate = task.dueDateISO ? new Date(task.dueDateISO) : null;

    if (task.boardPublicId && task.listPublicId) {
      const listInfo = await listRepo.getWorkspaceAndListIdByListPublicId(
        db,
        task.listPublicId,
      );
      if (!listInfo) {
        inboxCount += 1;
        await inboxItemRepo.create(db, {
          userId: result.userId,
          title: task.title,
          description: task.description,
          dueDate,
          source: "manual",
        });
        continue;
      }

      const newCard = await cardRepo.create(db, {
        title: task.title,
        description: task.description ?? "",
        createdBy: result.userId,
        listId: listInfo.id,
        workspaceId: listInfo.workspaceId,
        position: "end",
        dueDate,
      });
      createdCount += 1;

      if (task.assigneePublicId) {
        const member = await workspaceRepo.getMemberByPublicId(
          db,
          task.assigneePublicId,
        );
        if (member) {
          await cardRepo.bulkCreateCardWorkspaceMemberRelationships(db, [
            { cardId: newCard.id, workspaceMemberId: member.id },
          ]);
        }
      }
    } else {
      inboxCount += 1;
      await inboxItemRepo.create(db, {
        userId: result.userId,
        title: task.title,
        description: task.description,
        dueDate,
        source: "manual",
      });
    }
  }

  return { status: "confirmed", createdCount, inboxCount };
}

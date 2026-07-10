import type { dbClient } from "@kan/db/client";
import * as boardRepo from "@kan/db/repository/board.repo";
import * as telegramLinkRepo from "@kan/db/repository/telegramLink.repo";

import { matchOne } from "./match";
import { t, type Locale } from "./messages";
import { segmentTranscript } from "./segment";

export interface ResolvedTask {
  title: string;
  description: string | null;
  dueDateISO: string | null;
  boardPublicId: string | null;
  listPublicId: string | null;
  boardName: string | null;
  assigneePublicId: string | null;
  assigneeName: string | null;
}

const PENDING_BATCH_TTL_MS = 60 * 60 * 1000; // 1 saat

export async function resolveAndPersist(
  db: dbClient,
  input: { userId: string; transcript: string; anthropicApiKey: string },
): Promise<{ batchPublicId: string; resolved: ResolvedTask[] } | null> {
  const assignableBoards = await boardRepo.getAssignableContextByUserId(
    db,
    input.userId,
  );

  const parsedTasks = await segmentTranscript(
    input.anthropicApiKey,
    input.transcript,
    {
      nowISO: new Date().toISOString(),
      boards: assignableBoards.map((b) => ({
        name: b.boardName,
        // board.repo filters out members whose user.name is falsy at runtime,
        // but the mapped return type still carries `string | null` from the
        // schema — assert non-null here since the invariant is enforced upstream.
        members: b.members.map((m) => m.name!),
      })),
    },
  );

  if (parsedTasks.length === 0) return null;

  const resolved: ResolvedTask[] = parsedTasks.map((task) => {
    const boardId = matchOne(
      task.boardNameGuess,
      assignableBoards.map((b) => ({ id: b.boardPublicId, name: b.boardName })),
    );
    const board = assignableBoards.find((b) => b.boardPublicId === boardId);

    const assigneeId = board
      ? matchOne(
          task.assigneeNameGuess,
          board.members.map((m) => ({ id: m.memberPublicId, name: m.name! })),
        )
      : null;
    const assignee = board?.members.find(
      (m) => m.memberPublicId === assigneeId,
    );

    return {
      title: task.title,
      description: task.description,
      dueDateISO: task.dueDateISO,
      boardPublicId: board?.boardPublicId ?? null,
      listPublicId: board?.firstListPublicId ?? null,
      boardName: board?.boardName ?? null,
      assigneePublicId: assigneeId,
      assigneeName: assignee?.name ?? null,
    };
  });

  const batch = await telegramLinkRepo.createPendingBatch(db, {
    userId: input.userId,
    payload: JSON.stringify(resolved),
    expiresAt: new Date(Date.now() + PENDING_BATCH_TTL_MS),
  });

  if (!batch) return null;

  return { batchPublicId: batch.publicId, resolved };
}

export function formatSummary(
  resolved: ResolvedTask[],
  locale: Locale | null,
): string {
  return resolved
    .map((task, index) => {
      const target = task.boardName
        ? `${task.boardName} ${t("boardSuffix", locale)}${task.assigneeName ? ` → ${task.assigneeName}` : ""}`
        : t("inboxLabel", locale);
      const due = task.dueDateISO ? ` — ${task.dueDateISO}` : "";
      return `${index + 1}. [${target}] ${task.title}${due}`;
    })
    .join("\n");
}

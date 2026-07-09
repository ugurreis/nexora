import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@kan/db/repository/telegramLink.repo", () => ({
  consumePendingBatch: vi.fn(),
}));
vi.mock("@kan/db/repository/card.repo", () => ({
  create: vi.fn(),
  bulkCreateCardWorkspaceMemberRelationships: vi.fn(),
}));
vi.mock("@kan/db/repository/inboxItem.repo", () => ({
  create: vi.fn(),
}));
vi.mock("@kan/db/repository/list.repo", () => ({
  getWorkspaceAndListIdByListPublicId: vi.fn(),
}));
vi.mock("@kan/db/repository/workspace.repo", () => ({
  getMemberByPublicId: vi.fn(),
}));

import * as cardRepo from "@kan/db/repository/card.repo";
import * as inboxItemRepo from "@kan/db/repository/inboxItem.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as telegramLinkRepo from "@kan/db/repository/telegramLink.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { cancelBatch, confirmBatch } from "./confirm";

const mockDb = {} as never;

describe("confirmBatch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports already-consumed/expired when the batch cannot be consumed", async () => {
    (
      telegramLinkRepo.consumePendingBatch as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(undefined);

    const result = await confirmBatch(mockDb, "batch1");
    expect(result.status).toBe("already-consumed");
  });

  it("reports expired when the batch's expiresAt has passed", async () => {
    (
      telegramLinkRepo.consumePendingBatch as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      userId: "user-1",
      payload: "[]",
      expiresAt: new Date(Date.now() - 1000),
    });

    const result = await confirmBatch(mockDb, "batch1");
    expect(result.status).toBe("expired");
  });

  it("creates a card for resolved tasks and an inbox item for unresolved ones", async () => {
    const resolved = [
      {
        title: "Çekim",
        description: null,
        dueDateISO: "2026-07-07",
        boardPublicId: "brd1",
        listPublicId: "lst1",
        boardName: "TT Firması",
        assigneePublicId: "mem1",
        assigneeName: "Ahmet Yılmaz",
      },
      {
        title: "Belirsiz görev",
        description: null,
        dueDateISO: null,
        boardPublicId: null,
        listPublicId: null,
        boardName: null,
        assigneePublicId: null,
        assigneeName: null,
      },
    ];
    (
      telegramLinkRepo.consumePendingBatch as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      userId: "user-1",
      payload: JSON.stringify(resolved),
      expiresAt: new Date(Date.now() + 60_000),
    });
    (
      listRepo.getWorkspaceAndListIdByListPublicId as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({ id: 5, workspaceId: 9 });
    (cardRepo.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 1,
      publicId: "crd1",
    });
    (
      workspaceRepo.getMemberByPublicId as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({ id: 42 });
    (inboxItemRepo.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      publicId: "inb1",
    });

    const result = await confirmBatch(mockDb, "batch1");

    expect(result).toEqual({
      status: "confirmed",
      createdCount: 1,
      inboxCount: 1,
    });
    expect(cardRepo.bulkCreateCardWorkspaceMemberRelationships).toHaveBeenCalledWith(
      mockDb,
      [{ cardId: 1, workspaceMemberId: 42 }],
    );
  });
});

describe("cancelBatch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("consumes without creating anything", async () => {
    (
      telegramLinkRepo.consumePendingBatch as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      userId: "user-1",
      payload: "[]",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await cancelBatch(mockDb, "batch1");
    expect(result.status).toBe("cancelled");
    expect(cardRepo.create).not.toHaveBeenCalled();
  });
});

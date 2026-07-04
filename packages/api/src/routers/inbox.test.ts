import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@kan/db/repository/inboxItem.repo", () => ({
  getAllByUser: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  getByPublicId: vi.fn(),
  countCreatedSince: vi.fn(),
}));
vi.mock("@kan/db/repository/list.repo", () => ({
  getWorkspaceAndListIdByListPublicId: vi.fn(),
}));
vi.mock("@kan/db/repository/card.repo", () => ({
  create: vi.fn(),
}));
vi.mock("../utils/permissions", () => ({
  assertPermission: vi.fn(),
}));

import * as inboxRepo from "@kan/db/repository/inboxItem.repo";

const mockCreate = inboxRepo.create as ReturnType<typeof vi.fn>;
const mockGetAll = inboxRepo.getAllByUser as ReturnType<typeof vi.fn>;

const mockDb = {} as never;
const mockUser = { id: "user-1", email: "a@b.com", name: "A" };

describe("inbox.add / inbox.list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws UNAUTHORIZED when not authenticated", async () => {
    const { inboxRouter } = await import("./inbox");
    const ctx = { user: null, db: mockDb } as never;
    await expect(
      inboxRouter.createCaller(ctx).add({ title: "hi" }),
    ).rejects.toThrow(TRPCError);
  });

  it("creates a manual item scoped to the user", async () => {
    const { inboxRouter } = await import("./inbox");
    mockCreate.mockResolvedValueOnce({ publicId: "abc123abc123" });
    const ctx = { user: mockUser, db: mockDb } as never;

    const res = await inboxRouter.createCaller(ctx).add({ title: "buy milk" });

    expect(res).toEqual({ publicId: "abc123abc123" });
    expect(mockCreate).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        userId: "user-1",
        title: "buy milk",
        source: "manual",
      }),
    );
  });

  it("lists only the current user's items", async () => {
    const { inboxRouter } = await import("./inbox");
    mockGetAll.mockResolvedValueOnce([]);
    const ctx = { user: mockUser, db: mockDb } as never;

    await inboxRouter.createCaller(ctx).list();

    expect(mockGetAll).toHaveBeenCalledWith(mockDb, "user-1");
  });
});

describe("inbox.convertToCard", () => {
  const mockGetByPublicId = inboxRepo.getByPublicId as ReturnType<
    typeof vi.fn
  >;
  const mockSoftDelete = inboxRepo.softDelete as ReturnType<typeof vi.fn>;

  beforeEach(() => vi.clearAllMocks());

  it("throws NOT_FOUND when the item is not owned by the user", async () => {
    const { inboxRouter } = await import("./inbox");
    mockGetByPublicId.mockResolvedValueOnce({
      userId: "someone-else",
      title: "x",
    });
    const ctx = { user: mockUser, db: mockDb } as never;
    await expect(
      inboxRouter
        .createCaller(ctx)
        .convertToCard({
          publicId: "abc123abc123",
          listPublicId: "lst123lst123",
        }),
    ).rejects.toThrow(TRPCError);
  });

  it("throws NOT_FOUND when the target list does not exist", async () => {
    const { inboxRouter } = await import("./inbox");
    const listRepo = await import("@kan/db/repository/list.repo");
    mockGetByPublicId.mockResolvedValueOnce({ userId: "user-1", title: "x" });
    (
      listRepo.getWorkspaceAndListIdByListPublicId as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(null);
    const ctx = { user: mockUser, db: mockDb } as never;
    await expect(
      inboxRouter
        .createCaller(ctx)
        .convertToCard({
          publicId: "abc123abc123",
          listPublicId: "lst123lst123",
        }),
    ).rejects.toThrow(TRPCError);
  });

  it("creates a card and soft-deletes the item on success", async () => {
    const { inboxRouter } = await import("./inbox");
    const listRepo = await import("@kan/db/repository/list.repo");
    const cardRepo = await import("@kan/db/repository/card.repo");
    mockGetByPublicId.mockResolvedValueOnce({
      userId: "user-1",
      title: "buy milk",
      description: "2 litre",
      dueDate: null,
      sourceMeta: null,
    });
    (
      listRepo.getWorkspaceAndListIdByListPublicId as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      id: 5,
      workspaceId: 9,
      boardPublicId: "brd123brd123",
    });
    (cardRepo.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      publicId: "crd123crd123",
    });
    mockSoftDelete.mockResolvedValueOnce({ id: 1, publicId: "abc123abc123" });
    const ctx = { user: mockUser, db: mockDb } as never;

    const res = await inboxRouter
      .createCaller(ctx)
      .convertToCard({
        publicId: "abc123abc123",
        listPublicId: "lst123lst123",
      });

    expect(res).toEqual({
      cardPublicId: "crd123crd123",
      boardPublicId: "brd123brd123",
    });
    expect(cardRepo.create).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({ title: "buy milk", listId: 5, workspaceId: 9 }),
    );
    expect(mockSoftDelete).toHaveBeenCalled();
  });
});

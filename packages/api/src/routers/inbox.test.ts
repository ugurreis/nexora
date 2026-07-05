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

// convertToCard now wraps card-create + item-claim in ctx.db.transaction, so
// the db mock must expose transaction(cb) that runs the callback with a tx
// stand-in. Repo calls inside the transaction receive `mockTx`, not `mockDb`.
const mockTx = { __brand: "tx" } as never;
const mockDb = {
  transaction: async (cb: (tx: unknown) => unknown) => cb(mockTx),
} as never;
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
    const listRepo = await import("@kan/db/repository/list.repo");
    const cardRepo = await import("@kan/db/repository/card.repo");
    mockGetByPublicId.mockResolvedValueOnce({
      userId: "someone-else",
      title: "x",
    });
    (
      listRepo.getWorkspaceAndListIdByListPublicId as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      id: 5,
      workspaceId: 9,
      boardPublicId: "brd123brd123",
    });
    const ctx = { user: mockUser, db: mockDb } as never;
    await expect(
      inboxRouter
        .createCaller(ctx)
        .convertToCard({
          publicId: "abc123abc123",
          listPublicId: "lst123lst123",
        }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: "Inbox item not found" });
    expect(cardRepo.create).not.toHaveBeenCalled();
    // The list-lookup mock above is never consumed (owner check throws first);
    // drain its queued once-value here so it doesn't leak into the next test
    // (vi.clearAllMocks() clears call history but not queued mockResolvedValueOnce values).
    (
      listRepo.getWorkspaceAndListIdByListPublicId as ReturnType<typeof vi.fn>
    ).mockReset();
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
    const { assertPermission } = await import("../utils/permissions");
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
    // create + softDelete run inside the transaction → called with mockTx.
    expect(cardRepo.create).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({ title: "buy milk", listId: 5, workspaceId: 9 }),
    );
    expect(mockSoftDelete).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({ publicId: "abc123abc123", userId: "user-1" }),
    );
    // assertPermission runs before the transaction → called with ctx.db.
    expect(assertPermission).toHaveBeenCalledWith(mockDb, "user-1", 9, "card:create");
  });

  it("throws CONFLICT (rolling back the card) when the item was already claimed", async () => {
    const { inboxRouter } = await import("./inbox");
    const listRepo = await import("@kan/db/repository/list.repo");
    const cardRepo = await import("@kan/db/repository/card.repo");
    mockGetByPublicId.mockResolvedValueOnce({
      userId: "user-1",
      title: "buy milk",
      description: null,
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
    // A concurrent conversion already soft-deleted the item, so the guarded
    // softDelete matches zero rows and resolves undefined.
    mockSoftDelete.mockResolvedValueOnce(undefined);
    const ctx = { user: mockUser, db: mockDb } as never;

    await expect(
      inboxRouter
        .createCaller(ctx)
        .convertToCard({
          publicId: "abc123abc123",
          listPublicId: "lst123lst123",
        }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("does not create a card when permission is denied", async () => {
    const { inboxRouter } = await import("./inbox");
    const listRepo = await import("@kan/db/repository/list.repo");
    const cardRepo = await import("@kan/db/repository/card.repo");
    const { assertPermission } = await import("../utils/permissions");
    mockGetByPublicId.mockResolvedValueOnce({
      userId: "user-1",
      title: "x",
      sourceMeta: null,
    });
    (
      listRepo.getWorkspaceAndListIdByListPublicId as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      id: 5,
      workspaceId: 9,
      boardPublicId: "brd123brd123",
    });
    (assertPermission as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new TRPCError({ code: "FORBIDDEN", message: "no" }),
    );
    const ctx = { user: mockUser, db: mockDb } as never;
    await expect(
      inboxRouter
        .createCaller(ctx)
        .convertToCard({
          publicId: "abc123abc123",
          listPublicId: "lst123lst123",
        }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(cardRepo.create).not.toHaveBeenCalled();
    expect(mockSoftDelete).not.toHaveBeenCalled();
  });
});

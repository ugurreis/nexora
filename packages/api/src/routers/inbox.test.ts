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

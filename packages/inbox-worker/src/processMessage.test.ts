import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@kan/db/repository/user.repo", () => ({
  getByInboxEmailToken: vi.fn(),
}));
vi.mock("@kan/db/repository/inboxItem.repo", () => ({
  create: vi.fn(),
  countCreatedSince: vi.fn(),
}));

import * as inboxRepo from "@kan/db/repository/inboxItem.repo";
import * as userRepo from "@kan/db/repository/user.repo";

import { processMessage } from "./processMessage";

const mockGetUser = userRepo.getByInboxEmailToken as ReturnType<typeof vi.fn>;
const mockCount = inboxRepo.countCreatedSince as ReturnType<typeof vi.fn>;
const mockCreate = inboxRepo.create as ReturnType<typeof vi.fn>;
const db = {} as never;
const opts = { requireFromMatch: true, maxPerHour: 100 };

beforeEach(() => {
  vi.clearAllMocks();
  mockCount.mockResolvedValue(0);
});

describe("processMessage", () => {
  it("drops when no token in recipient", async () => {
    const res = await processMessage(db, { to: "inbox@nexovias.com" }, opts);
    expect(res).toEqual({ status: "dropped", reason: "no-token" });
  });

  it("drops on unknown token", async () => {
    mockGetUser.mockResolvedValueOnce(undefined);
    const res = await processMessage(
      db,
      { to: "inbox+unknown@nexovias.com" },
      opts,
    );
    expect(res).toEqual({ status: "dropped", reason: "unknown-token" });
  });

  it("drops on from mismatch when requireFromMatch=true", async () => {
    mockGetUser.mockResolvedValueOnce({ id: "u1", email: "owner@x.com" });
    const res = await processMessage(
      db,
      { to: "inbox+tok@nexovias.com", from: "attacker@evil.com", subject: "hi" },
      opts,
    );
    expect(res).toEqual({ status: "dropped", reason: "from-mismatch" });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("drops when over the hourly rate limit", async () => {
    mockGetUser.mockResolvedValueOnce({ id: "u1", email: "owner@x.com" });
    mockCount.mockResolvedValueOnce(100);
    const res = await processMessage(
      db,
      { to: "inbox+tok@nexovias.com", from: "owner@x.com", subject: "hi" },
      opts,
    );
    expect(res).toEqual({ status: "dropped", reason: "rate-limited" });
  });

  it("creates an email item on the happy path", async () => {
    mockGetUser.mockResolvedValueOnce({ id: "u1", email: "owner@x.com" });
    mockCreate.mockResolvedValueOnce({ publicId: "pub123pub123" });
    const res = await processMessage(
      db,
      {
        to: "inbox+tok@nexovias.com",
        from: "Owner <owner@x.com>",
        subject: "Buy milk",
        text: "2 litre",
        messageId: "<m1@x>",
        date: new Date("2026-07-04T10:00:00Z"),
      },
      opts,
    );
    expect(res).toEqual({ status: "created", publicId: "pub123pub123" });
    expect(mockCreate).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        userId: "u1",
        title: "Buy milk",
        description: "2 litre",
        source: "email",
      }),
    );
  });

  it("skips from-match when requireFromMatch=false", async () => {
    mockGetUser.mockResolvedValueOnce({ id: "u1", email: "owner@x.com" });
    mockCreate.mockResolvedValueOnce({ publicId: "pub999" });
    const res = await processMessage(
      db,
      { to: "inbox+tok@nexovias.com", from: "anyone@z.com", subject: "hey" },
      { requireFromMatch: false, maxPerHour: 100 },
    );
    expect(res.status).toBe("created");
  });
});

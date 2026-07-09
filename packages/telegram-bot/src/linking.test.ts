import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@kan/db/repository/telegramLink.repo", () => ({
  upsertLink: vi.fn(),
  consumeLinkToken: vi.fn(),
}));

import * as telegramLinkRepo from "@kan/db/repository/telegramLink.repo";
import { handleStart } from "./linking";

const mockDb = {} as never;

describe("handleStart", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns invalid-token when the token cannot be consumed (expired/unknown/already used)", async () => {
    (
      telegramLinkRepo.consumeLinkToken as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(undefined);

    const result = await handleStart(mockDb, { chatId: 123n, token: "bad" });

    expect(result).toBe("invalid-token");
    expect(telegramLinkRepo.upsertLink).not.toHaveBeenCalled();
  });

  it("links the chat to the token's userId on success", async () => {
    (
      telegramLinkRepo.consumeLinkToken as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({ userId: "user-1" });
    (
      telegramLinkRepo.upsertLink as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({ publicId: "lnk1" });

    const result = await handleStart(mockDb, { chatId: 123n, token: "good" });

    expect(result).toBe("linked");
    expect(telegramLinkRepo.upsertLink).toHaveBeenCalledWith(mockDb, {
      userId: "user-1",
      telegramChatId: 123n,
    });
  });

  it("returns chat-already-linked-to-another-user on unique-constraint violation", async () => {
    (
      telegramLinkRepo.consumeLinkToken as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({ userId: "user-1" });
    (
      telegramLinkRepo.upsertLink as ReturnType<typeof vi.fn>
    ).mockRejectedValueOnce(
      Object.assign(new Error("duplicate key"), { code: "23505" }),
    );

    const result = await handleStart(mockDb, { chatId: 123n, token: "good" });

    expect(result).toBe("chat-already-linked-to-another-user");
  });
});

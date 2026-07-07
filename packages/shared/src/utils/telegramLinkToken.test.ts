import { describe, expect, it } from "vitest";

import {
  signTelegramLinkToken,
  verifyTelegramLinkToken,
} from "./telegramLinkToken";

describe("telegramLinkToken", () => {
  it("round-trips a valid token", () => {
    const token = signTelegramLinkToken("user-1", "secret", 600);
    expect(verifyTelegramLinkToken(token, "secret")).toEqual({
      userId: "user-1",
    });
  });

  it("rejects a token signed with a different secret", () => {
    const token = signTelegramLinkToken("user-1", "secret-a", 600);
    expect(verifyTelegramLinkToken(token, "secret-b")).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = signTelegramLinkToken("user-1", "secret", -1);
    expect(verifyTelegramLinkToken(token, "secret")).toBeNull();
  });

  it("rejects a malformed token", () => {
    expect(verifyTelegramLinkToken("not-a-token", "secret")).toBeNull();
    expect(verifyTelegramLinkToken("a.b.c", "secret")).toBeNull();
  });
});

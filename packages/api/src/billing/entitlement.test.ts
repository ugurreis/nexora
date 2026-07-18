import { describe, expect, it } from "vitest";

import {
  isEntitledStatus,
  workspacePlanForSubscription,
  workspacePlanFromKey,
} from "./entitlement";

describe("isEntitledStatus", () => {
  it("only active and trialing are entitled", () => {
    expect(isEntitledStatus("active")).toBe(true);
    expect(isEntitledStatus("trialing")).toBe(true);
    expect(isEntitledStatus("past_due")).toBe(false);
    expect(isEntitledStatus("canceled")).toBe(false);
    expect(isEntitledStatus("unpaid")).toBe(false);
    expect(isEntitledStatus("incomplete")).toBe(false);
    expect(isEntitledStatus("paused")).toBe(false);
  });
});

describe("workspacePlanFromKey", () => {
  it("maps neutral plan keys to workspace_plan enum values", () => {
    expect(workspacePlanFromKey("standard")).toBe("team");
    expect(workspacePlanFromKey("premium")).toBe("pro");
    expect(workspacePlanFromKey(null)).toBe("free");
  });
});

describe("workspacePlanForSubscription", () => {
  it("grants the mapped plan only while entitled", () => {
    expect(workspacePlanForSubscription("active", "premium")).toBe("pro");
    expect(workspacePlanForSubscription("trialing", "standard")).toBe("team");
  });

  it("revokes to free on any non-entitled status", () => {
    expect(workspacePlanForSubscription("canceled", "premium")).toBe("free");
    expect(workspacePlanForSubscription("past_due", "premium")).toBe("free");
    expect(workspacePlanForSubscription("unpaid", "standard")).toBe("free");
  });
});

import { describe, expect, it } from "vitest";

import { kindFromCreemEvent, mapCreemStatus } from "./status";

describe("mapCreemStatus", () => {
  it("maps known statuses", () => {
    expect(mapCreemStatus("active")).toBe("active");
    expect(mapCreemStatus("trialing")).toBe("trialing");
    expect(mapCreemStatus("past_due")).toBe("past_due");
    expect(mapCreemStatus("unpaid")).toBe("unpaid");
    expect(mapCreemStatus("paused")).toBe("paused");
    expect(mapCreemStatus("canceled")).toBe("canceled");
    expect(mapCreemStatus("expired")).toBe("canceled");
  });

  it("falls back to canceled for unknown (never leave access open)", () => {
    expect(mapCreemStatus("weird")).toBe("canceled");
    expect(mapCreemStatus(undefined)).toBe("canceled");
  });
});

describe("kindFromCreemEvent", () => {
  it("classifies activation events", () => {
    expect(kindFromCreemEvent("subscription.active")).toBe("activated");
    expect(kindFromCreemEvent("subscription.paid")).toBe("activated");
    expect(kindFromCreemEvent("subscription.trialing")).toBe("activated");
  });

  it("classifies revocation events", () => {
    expect(kindFromCreemEvent("subscription.canceled")).toBe("revoked");
    expect(kindFromCreemEvent("subscription.expired")).toBe("revoked");
    expect(kindFromCreemEvent("refund.created")).toBe("revoked");
    expect(kindFromCreemEvent("dispute.created")).toBe("revoked");
  });

  it("classifies past_due and updates", () => {
    expect(kindFromCreemEvent("subscription.past_due")).toBe("past_due");
    expect(kindFromCreemEvent("subscription.update")).toBe("updated");
    expect(kindFromCreemEvent("subscription.scheduled_cancel")).toBe("updated");
  });

  it("ignores unrelated events", () => {
    expect(kindFromCreemEvent("checkout.completed")).toBe("ignored");
    expect(kindFromCreemEvent("something.else")).toBe("ignored");
  });
});

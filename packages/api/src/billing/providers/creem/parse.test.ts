import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { parseCreemEvent } from "./parse";

const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env.CREEM_PRODUCT_PREMIUM_YEARLY = "prod_py";
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

function envelope(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: "evt_1",
    eventType: "subscription.active",
    created_at: 1728734327355,
    object: {
      id: "sub_1",
      status: "active",
      customer: { id: "cus_1", email: "a@b.com" },
      product: { id: "prod_py" },
      current_period_end_date: "2027-07-13T00:00:00.000Z",
      units: 3,
      metadata: { workspacePublicId: "ws_123" },
      ...over,
    },
  });
}

describe("parseCreemEvent", () => {
  it("parses a subscription.active envelope into a neutral event", () => {
    const ev = parseCreemEvent(envelope());
    expect(ev.eventId).toBe("evt_1");
    expect(ev.eventAt).toBe(1728734327355);
    expect(ev.kind).toBe("activated");
    expect(ev.subscription).toMatchObject({
      provider: "creem",
      providerCustomerId: "cus_1",
      providerSubscriptionId: "sub_1",
      providerProductId: "prod_py",
      planKey: "premium",
      period: "yearly",
      status: "active",
      seats: 3,
      workspacePublicId: "ws_123",
      cancelAtPeriodEnd: false,
    });
    expect(ev.subscription?.currentPeriodEnd?.toISOString()).toBe(
      "2027-07-13T00:00:00.000Z",
    );
  });

  it("flags cancelAtPeriodEnd on scheduled_cancel", () => {
    const body = JSON.stringify({
      id: "evt_2",
      eventType: "subscription.scheduled_cancel",
      created_at: 1728734327400,
      object: {
        id: "sub_1",
        status: "active",
        customer: { id: "cus_1" },
        product: { id: "prod_py" },
        metadata: { workspacePublicId: "ws_123" },
      },
    });
    const ev = parseCreemEvent(body);
    expect(ev.kind).toBe("updated");
    expect(ev.subscription?.cancelAtPeriodEnd).toBe(true);
  });

  it("leaves workspacePublicId null when metadata is absent", () => {
    const ev = parseCreemEvent(envelope({ metadata: {} }));
    expect(ev.subscription?.workspacePublicId).toBeNull();
  });

  it("maps an unknown product id to a null planKey", () => {
    const ev = parseCreemEvent(envelope({ product: { id: "prod_x" } }));
    expect(ev.subscription?.planKey).toBeNull();
  });
});

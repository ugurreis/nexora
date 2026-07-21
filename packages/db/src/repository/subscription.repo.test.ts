import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDrizzleClient } from "@kan/db/client";
import { subscription, workspaces } from "@kan/db/schema";
import * as subscriptionRepo from "./subscription.repo";

const db = createDrizzleClient();

const publicId = () => randomUUID().replace(/-/g, "").slice(0, 12);

describe("subscription.repo — applyProviderWebhookEvent", () => {
  let workspacePublicId: string;
  let providerSubscriptionId: string;

  beforeAll(async () => {
    workspacePublicId = publicId();
    providerSubscriptionId = `sub_${publicId()}`;
    await db.insert(workspaces).values({
      publicId: workspacePublicId,
      name: "Billing Test WS",
      slug: `billing-test-${publicId()}`,
    });
  });

  afterAll(async () => {
    await db
      .delete(subscription)
      .where(
        eq(subscription.providerSubscriptionId, providerSubscriptionId),
      );
    await db
      .delete(workspaces)
      .where(eq(workspaces.publicId, workspacePublicId));
  });

  const baseEvent = (over: Record<string, unknown> = {}) => ({
    eventId: "evt_1",
    eventAt: 1_000,
    provider: "creem",
    providerSubscriptionId,
    providerCustomerId: "cus_1",
    providerProductId: "prod_py",
    referenceId: workspacePublicId,
    planKey: "premium",
    billingPeriod: "yearly",
    status: "active",
    plan: "pro",
    seats: 3,
    periodEnd: new Date("2027-07-13T00:00:00.000Z"),
    cancelAtPeriodEnd: false,
    ...over,
  });

  it("inserts on first event, then is idempotent for a duplicate eventId", async () => {
    const first = await subscriptionRepo.applyProviderWebhookEvent(
      db,
      baseEvent(),
    );
    expect(first.applied).toBe(true);

    const dup = await subscriptionRepo.applyProviderWebhookEvent(
      db,
      baseEvent({ status: "canceled", plan: "free" }),
    );
    expect(dup.applied).toBe(false);
    expect(dup.reason).toBe("duplicate");

    const row = await subscriptionRepo.getByProviderSubscriptionId(
      db,
      providerSubscriptionId,
    );
    // duplicate must NOT have overwritten the active status
    expect(row?.status).toBe("active");
    expect(row?.planKey).toBe("premium");
    expect(row?.lastEventId).toBe("evt_1");
  });

  it("ignores an out-of-order (older) event", async () => {
    // newer event advances state
    await subscriptionRepo.applyProviderWebhookEvent(
      db,
      baseEvent({ eventId: "evt_3", eventAt: 3_000, seats: 5 }),
    );
    // older event arriving late must not overwrite
    const stale = await subscriptionRepo.applyProviderWebhookEvent(
      db,
      baseEvent({ eventId: "evt_2", eventAt: 2_000, seats: 99 }),
    );
    expect(stale.applied).toBe(false);
    expect(stale.reason).toBe("stale");

    const row = await subscriptionRepo.getByProviderSubscriptionId(
      db,
      providerSubscriptionId,
    );
    expect(row?.seats).toBe(5);
    expect(row?.lastEventId).toBe("evt_3");
  });

  it("applies a newer cancellation event", async () => {
    const canceled = await subscriptionRepo.applyProviderWebhookEvent(
      db,
      baseEvent({
        eventId: "evt_9",
        eventAt: 9_000,
        status: "canceled",
        plan: "free",
        cancelAtPeriodEnd: true,
      }),
    );
    expect(canceled.applied).toBe(true);

    const row = await subscriptionRepo.getByProviderSubscriptionId(
      db,
      providerSubscriptionId,
    );
    expect(row?.status).toBe("canceled");
    expect(row?.cancelAtPeriodEnd).toBe(true);
  });
});

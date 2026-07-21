import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { subscription } from "@kan/db/schema";

export const updateById = async (
  db: dbClient,
  subscriptionId: number,
  updates: {
    plan?: string;
    unlimitedSeats?: boolean;
    status?: string;
    seats?: number | null;
    periodStart?: Date | null;
    periodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean | null;
    stripeSubscriptionId?: string | null;
    referenceId?: string | null;
    partnerLicenseKey?: string;
    partnerTier?: number;
  },
) => {
  const [result] = await db
    .update(subscription)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(subscription.id, subscriptionId))
    .returning({
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      unlimitedSeats: subscription.unlimitedSeats,
      referenceId: subscription.referenceId,
    });

  return result;
};

export const updateByStripeSubscriptionId = async (
  db: dbClient,
  stripeSubscriptionId: string,
  updates: {
    unlimitedSeats?: boolean;
    status?: string;
    seats?: number | null;
    periodStart?: Date | null;
    periodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean | null;
  },
) => {
  const [result] = await db
    .update(subscription)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(subscription.stripeSubscriptionId, stripeSubscriptionId))
    .returning({
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      unlimitedSeats: subscription.unlimitedSeats,
    });

  return result;
};

export const updateAllByPartnerLicenseKey = async (
  db: dbClient,
  partnerLicenseKey: string,
  updates: {
    plan?: string;
    status?: string;
    partnerTier?: number;
    seats?: number | null;
    unlimitedSeats?: boolean;
  },
) => {
  return await db
    .update(subscription)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(subscription.partnerLicenseKey, partnerLicenseKey))
    .returning({ id: subscription.id });
};

export const getByStripeSubscriptionId = async (
  db: dbClient,
  stripeSubscriptionId: string,
) => {
  return await db.query.subscription.findFirst({
    where: eq(subscription.stripeSubscriptionId, stripeSubscriptionId),
  });
};

export const getByReferenceId = async (db: dbClient, referenceId: string) => {
  return await db.query.subscription.findMany({
    where: eq(subscription.referenceId, referenceId),
  });
};

export const create = async (
  db: dbClient,
  data: {
    plan: string;
    referenceId: string;
    userId: string;
    stripeCustomerId: string;
    status: string;
  },
) => {
  const [result] = await db.insert(subscription).values(data).returning();
  return result;
};

export const getByProviderSubscriptionId = async (
  db: dbClient,
  providerSubscriptionId: string,
) => {
  return await db.query.subscription.findFirst({
    where: eq(subscription.providerSubscriptionId, providerSubscriptionId),
  });
};

/**
 * Idempotently apply a provider webhook event to the subscription row.
 *
 * Guarantees (webhook safety):
 * - Duplicate delivery: same provider eventId as last processed -> no-op.
 * - Out-of-order delivery: eventAt older than last processed -> no-op (an old
 *   event can never overwrite a newer state).
 * - Concurrency: the row is locked FOR UPDATE inside a transaction so two
 *   concurrent deliveries cannot both apply.
 *
 * Returns whether the event was applied and the affected row id. Persistence is
 * provider-neutral; the caller maps status -> workspace entitlement.
 */
export const applyProviderWebhookEvent = async (
  db: dbClient,
  input: {
    eventId: string;
    /** provider event created-at, ms epoch (ordering key) */
    eventAt: number;
    provider: string;
    providerSubscriptionId: string;
    providerCustomerId: string;
    providerProductId: string;
    referenceId: string | null;
    planKey: string | null;
    billingPeriod: string | null;
    status: string;
    /** value written to subscription.plan (workspace_plan vocabulary) */
    plan: string;
    seats: number | null;
    periodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
  },
): Promise<{
  applied: boolean;
  reason?: "duplicate" | "stale";
  id?: number;
}> => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(subscription)
      .where(
        eq(subscription.providerSubscriptionId, input.providerSubscriptionId),
      )
      .for("update");

    if (existing) {
      if (existing.lastEventId && existing.lastEventId === input.eventId) {
        return { applied: false, reason: "duplicate" as const, id: existing.id };
      }
      if (
        existing.lastEventAt &&
        input.eventAt <= existing.lastEventAt.getTime()
      ) {
        return { applied: false, reason: "stale" as const, id: existing.id };
      }

      const [row] = await tx
        .update(subscription)
        .set({
          provider: input.provider,
          providerCustomerId: input.providerCustomerId,
          providerProductId: input.providerProductId,
          referenceId: input.referenceId,
          planKey: input.planKey,
          billingPeriod: input.billingPeriod,
          status: input.status,
          plan: input.plan,
          seats: input.seats,
          periodEnd: input.periodEnd,
          cancelAtPeriodEnd: input.cancelAtPeriodEnd,
          lastEventId: input.eventId,
          lastEventAt: new Date(input.eventAt),
          updatedAt: new Date(),
        })
        .where(eq(subscription.id, existing.id))
        .returning({ id: subscription.id });

      return { applied: true, id: row?.id };
    }

    const [row] = await tx
      .insert(subscription)
      .values({
        provider: input.provider,
        providerCustomerId: input.providerCustomerId,
        providerSubscriptionId: input.providerSubscriptionId,
        providerProductId: input.providerProductId,
        referenceId: input.referenceId,
        planKey: input.planKey,
        billingPeriod: input.billingPeriod,
        status: input.status,
        plan: input.plan,
        seats: input.seats,
        periodEnd: input.periodEnd,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        lastEventId: input.eventId,
        lastEventAt: new Date(input.eventAt),
      })
      .returning({ id: subscription.id });

    return { applied: true, id: row?.id };
  });
};

export const getByPartnerLicenseKey = async (
  db: dbClient,
  partnerLicenseKey: string,
) => {
  return await db.query.subscription.findFirst({
    where: eq(subscription.partnerLicenseKey, partnerLicenseKey),
  });
};

export const getAllByPartnerLicenseKey = async (
  db: dbClient,
  partnerLicenseKey: string,
) => {
  return await db.query.subscription.findMany({
    where: eq(subscription.partnerLicenseKey, partnerLicenseKey),
    orderBy: [asc(subscription.id)],
  });
};

export const getFirstUnlinkedSlotByLicenseKey = async (
  db: dbClient,
  partnerLicenseKey: string,
) => {
  return await db.query.subscription.findFirst({
    where: and(
      eq(subscription.partnerLicenseKey, partnerLicenseKey),
      isNull(subscription.referenceId),
      inArray(subscription.status, ["active", "trialing"]),
    ),
    orderBy: [asc(subscription.id)],
  });
};

export const getAllActivePartnerSubsByWorkspaceIds = async (
  db: dbClient,
  workspacePublicIds: string[],
) => {
  if (workspacePublicIds.length === 0) return [];
  return await db.query.subscription.findMany({
    where: and(
      inArray(subscription.referenceId, workspacePublicIds),
      isNotNull(subscription.partnerLicenseKey),
      inArray(subscription.status, ["active", "trialing"]),
    ),
  });
};

export const getFirstActivePartnerSubByWorkspaceIds = async (
  db: dbClient,
  workspacePublicIds: string[],
) => {
  return await db.query.subscription.findFirst({
    where: and(
      inArray(subscription.referenceId, workspacePublicIds),
      isNotNull(subscription.partnerLicenseKey),
      inArray(subscription.status, ["active", "trialing"]),
    ),
  });
};

export const createPartnerLicenseSlots = async (
  db: dbClient,
  partnerLicenseKey: string,
  data: {
    plan: string;
    status: string;
    partnerTier: number;
    seats: number | null;
    unlimitedSeats: boolean;
  },
  count: number,
) => {
  const rows = Array.from({ length: count }, () => ({
    partnerLicenseKey,
    ...data,
    referenceId: null,
  }));
  return await db.insert(subscription).values(rows).returning();
};

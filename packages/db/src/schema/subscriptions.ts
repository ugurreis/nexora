import { relations, sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { workspaces } from "./workspaces";

export const subscription = pgTable(
  "subscription",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    plan: varchar("plan", { length: 255 }).notNull(),
    referenceId: varchar("referenceId", { length: 12 }).references(
      () => workspaces.publicId,
      { onDelete: "set null" },
    ),
    // Legacy Stripe-shaped columns. Kept for back-compat with the better-auth
    // Stripe plugin and existing rows; new writes use the provider-neutral
    // columns below. Removal is deferred to a dedicated cleanup pass.
    stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
    stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
    // Provider-neutral billing columns (Faz A).
    provider: varchar("provider", { length: 32 }),
    providerCustomerId: varchar("providerCustomerId", { length: 255 }),
    providerSubscriptionId: varchar("providerSubscriptionId", { length: 255 }),
    providerProductId: varchar("providerProductId", { length: 255 }),
    planKey: varchar("planKey", { length: 32 }),
    billingPeriod: varchar("billingPeriod", { length: 7 }),
    // Webhook idempotency + ordering guard.
    lastEventId: varchar("lastEventId", { length: 255 }),
    lastEventAt: timestamp("lastEventAt"),
    status: varchar("status", { length: 255 }).notNull(),
    periodStart: timestamp("periodStart"),
    periodEnd: timestamp("periodEnd"),
    cancelAtPeriodEnd: boolean("cancelAtPeriodEnd"),
    seats: integer("seats"),
    unlimitedSeats: boolean("unlimitedSeats").default(false).notNull(),
    trialStart: timestamp("trialStart"),
    trialEnd: timestamp("trialEnd"),
    partnerLicenseKey: varchar("partnerLicenseKey", { length: 255 }),
    partnerTier: integer("partnerTier"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [
    // One row per provider subscription; partial so partner-license slots
    // (providerSubscriptionId NULL) are unaffected. Enables idempotent upsert.
    uniqueIndex("subscription_provider_subscription_id_idx")
      .on(table.providerSubscriptionId)
      .where(sql`${table.providerSubscriptionId} IS NOT NULL`),
  ],
).enableRLS();

export const subscriptionsRelations = relations(subscription, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [subscription.referenceId],
    references: [workspaces.publicId],
  }),
}));

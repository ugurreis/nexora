ALTER TABLE "subscription" ADD COLUMN "provider" varchar(32);--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "providerCustomerId" varchar(255);--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "providerSubscriptionId" varchar(255);--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "providerProductId" varchar(255);--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "planKey" varchar(32);--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "billingPeriod" varchar(7);--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "lastEventId" varchar(255);--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "lastEventAt" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_provider_subscription_id_idx" ON "subscription" USING btree ("providerSubscriptionId") WHERE "subscription"."providerSubscriptionId" IS NOT NULL;
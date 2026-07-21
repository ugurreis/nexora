import { BillingConfigError } from "../../types";
import type { BillingPeriod, PlanKey } from "../../types";

/** plan+period -> env var name holding the Creem product id. */
const ENV_KEY: Record<PlanKey, Record<BillingPeriod, string>> = {
  standard: {
    monthly: "CREEM_PRODUCT_STANDARD_MONTHLY",
    yearly: "CREEM_PRODUCT_STANDARD_YEARLY",
  },
  premium: {
    monthly: "CREEM_PRODUCT_PREMIUM_MONTHLY",
    yearly: "CREEM_PRODUCT_PREMIUM_YEARLY",
  },
};

export function creemApiBase(): string {
  return process.env.CREEM_API_BASE ?? "https://api.creem.io";
}

export function creemApiKey(): string {
  const key = process.env.CREEM_API_KEY;
  if (!key) throw new BillingConfigError("Missing CREEM_API_KEY");
  return key;
}

export function creemWebhookSecret(): string {
  const secret = process.env.CREEM_WEBHOOK_SECRET;
  if (!secret) throw new BillingConfigError("Missing CREEM_WEBHOOK_SECRET");
  return secret;
}

/** Resolve a Creem product id from server config. Never trusts client input. */
export function resolveCreemProductId(
  plan: PlanKey,
  period: BillingPeriod,
): string {
  const key = ENV_KEY[plan][period];
  const value = process.env[key];
  if (!value) {
    throw new BillingConfigError(`Missing Creem product id env var: ${key}`);
  }
  return value;
}

/** Reverse-map a Creem product id (from a webhook) back to plan+period. */
export function planFromCreemProductId(
  productId: string | undefined | null,
): { plan: PlanKey; period: BillingPeriod } | null {
  if (!productId) return null;
  for (const plan of ["standard", "premium"] as const) {
    for (const period of ["monthly", "yearly"] as const) {
      if (process.env[ENV_KEY[plan][period]] === productId) {
        return { plan, period };
      }
    }
  }
  return null;
}

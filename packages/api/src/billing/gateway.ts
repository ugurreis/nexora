import type { BillingGateway } from "./types";
import { createCreemGateway } from "./providers/creem/adapter";

/**
 * Resolve the active billing provider. Callers depend on the neutral
 * {@link BillingGateway} interface; swapping providers is a factory change here.
 */
export function getBillingGateway(): BillingGateway {
  const provider = process.env.BILLING_PROVIDER ?? "creem";
  switch (provider) {
    case "creem":
      return createCreemGateway();
    default:
      throw new Error(`Unknown BILLING_PROVIDER: ${provider}`);
  }
}

export type { BillingGateway };

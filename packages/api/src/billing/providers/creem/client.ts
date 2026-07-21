import { BillingProviderError } from "../../types";
import type { BillingPeriod, PlanKey } from "../../types";
import { creemApiBase, creemApiKey, resolveCreemProductId } from "./config";

/** POST /v1/checkouts — server-side. Secret + product id never come from the client. */
export async function createCreemCheckout(input: {
  plan: PlanKey;
  period: BillingPeriod;
  seats: number;
  successUrl: string;
  metadata: Record<string, string>;
  requestId: string;
  customerEmail?: string;
}): Promise<{ checkoutUrl: string }> {
  const res = await fetch(`${creemApiBase()}/v1/checkouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": creemApiKey(),
    },
    body: JSON.stringify({
      product_id: resolveCreemProductId(input.plan, input.period),
      units: input.seats,
      success_url: input.successUrl,
      metadata: input.metadata,
      request_id: input.requestId,
      ...(input.customerEmail
        ? { customer: { email: input.customerEmail } }
        : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new BillingProviderError(`Creem checkout failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { checkout_url?: string };
  if (!data.checkout_url) {
    throw new BillingProviderError("Creem checkout: missing checkout_url");
  }
  return { checkoutUrl: data.checkout_url };
}

/** POST /v1/customers/billing — self-service billing portal link for one customer. */
export async function createCreemPortal(input: {
  providerCustomerId: string;
}): Promise<{ portalUrl: string }> {
  const res = await fetch(`${creemApiBase()}/v1/customers/billing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": creemApiKey(),
    },
    body: JSON.stringify({ customer_id: input.providerCustomerId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new BillingProviderError(`Creem portal failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { customer_portal_link?: string };
  if (!data.customer_portal_link) {
    throw new BillingProviderError("Creem portal: missing customer_portal_link");
  }
  return { portalUrl: data.customer_portal_link };
}

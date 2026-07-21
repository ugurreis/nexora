import type {
  BillingGateway,
  CheckoutParams,
  CheckoutResult,
  NeutralWebhookEvent,
  PortalParams,
  PortalResult,
  WebhookInput,
} from "../../types";
import { BillingSignatureError } from "../../types";
import { createCreemCheckout, createCreemPortal } from "./client";
import { creemWebhookSecret } from "./config";
import { parseCreemEvent } from "./parse";
import { verifyCreemSignature } from "./signature";

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const v = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

/** Creem implementation of the neutral BillingGateway. */
export function createCreemGateway(): BillingGateway {
  return {
    provider: "creem",

    async createCheckoutSession(
      params: CheckoutParams,
    ): Promise<CheckoutResult> {
      const { checkoutUrl } = await createCreemCheckout(params);
      return { url: checkoutUrl };
    },

    async createPortalSession(params: PortalParams): Promise<PortalResult> {
      const { portalUrl } = await createCreemPortal({
        providerCustomerId: params.providerCustomerId,
      });
      return { url: portalUrl };
    },

    verifyAndParseWebhook(input: WebhookInput): NeutralWebhookEvent {
      const signature = headerValue(input.headers, "creem-signature");
      if (!verifyCreemSignature(input.rawBody, signature, creemWebhookSecret())) {
        throw new BillingSignatureError();
      }
      return parseCreemEvent(input.rawBody);
    },
  };
}

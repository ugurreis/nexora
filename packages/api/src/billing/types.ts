// Provider-neutral billing boundary types (Nexora product-local thin adapter).
//
// The concrete provider (Creem) lives ONLY under ./providers/*. Nothing outside
// packages/api/src/billing/providers imports a provider SDK or provider-shaped
// field. This boundary is intentionally small so it can later be lifted to a
// THE NOVA shared billing service by adding another BillingGateway implementation.

export type BillingProviderId = "creem";

/** Paid plan keys, provider-neutral. "free" is the absence of a paid subscription. */
export type PlanKey = "standard" | "premium";

export type BillingPeriod = "monthly" | "yearly";

/** Provider-neutral subscription lifecycle status. */
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "paused";

export interface CheckoutParams {
  plan: PlanKey;
  period: BillingPeriod;
  seats: number;
  successUrl: string;
  /** Opaque, provider-independent request key for idempotency/tracing. */
  requestId: string;
  /** Attached to the provider subscription; echoed back on webhooks. */
  metadata: Record<string, string>;
  customerEmail?: string;
}

export interface CheckoutResult {
  url: string;
}

export interface PortalParams {
  providerCustomerId: string;
}

export interface PortalResult {
  url: string;
}

export interface WebhookInput {
  rawBody: string;
  /** Raw request headers; the provider adapter extracts its own signature header. */
  headers: Record<string, string | string[] | undefined>;
}

/** How the entitlement layer should react to a webhook event. */
export type BillingEventKind =
  | "activated" // active/paid/trialing -> grant paid access
  | "updated" // plan/period/seat change while entitled
  | "revoked" // canceled/expired/unpaid/refund/dispute -> revoke access
  | "past_due" // payment failed, retries underway -> keep but flag
  | "ignored"; // events we intentionally do not act on

export interface NeutralSubscription {
  provider: BillingProviderId;
  providerCustomerId: string;
  providerSubscriptionId: string;
  providerProductId: string;
  planKey: PlanKey | null;
  period: BillingPeriod | null;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  seats: number | null;
  /** Workspace this subscription entitles, resolved from provider metadata. */
  workspacePublicId: string | null;
}

export interface NeutralWebhookEvent {
  /** Provider event id (e.g. "evt_..."). Idempotency key. */
  eventId: string;
  /** Provider event created-at, ms epoch. Ordering key. */
  eventAt: number;
  rawType: string;
  kind: BillingEventKind;
  subscription: NeutralSubscription | null;
}

/**
 * Provider-neutral billing boundary. API routes depend ONLY on this interface,
 * never on a provider SDK. See ./gateway.ts for the factory.
 */
export interface BillingGateway {
  readonly provider: string;
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult>;
  createPortalSession(params: PortalParams): Promise<PortalResult>;
  /**
   * Verify the signature then parse into a neutral event.
   * Throws {@link BillingSignatureError} when the signature is missing/invalid.
   */
  verifyAndParseWebhook(input: WebhookInput): NeutralWebhookEvent;
}

// --- Errors (provider-neutral) ---

export class BillingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingError";
  }
}

/** Missing/invalid server configuration (env, secret, product id). */
export class BillingConfigError extends BillingError {
  constructor(message: string) {
    super(message);
    this.name = "BillingConfigError";
  }
}

/** Webhook signature missing or invalid. */
export class BillingSignatureError extends BillingError {
  constructor(message = "Invalid webhook signature") {
    super(message);
    this.name = "BillingSignatureError";
  }
}

/** Provider HTTP call failed. */
export class BillingProviderError extends BillingError {
  constructor(message: string) {
    super(message);
    this.name = "BillingProviderError";
  }
}

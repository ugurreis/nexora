import type { BillingEventKind, SubscriptionStatus } from "../../types";

/** Map a Creem subscription object status string to a neutral status. */
export function mapCreemStatus(raw: string | undefined): SubscriptionStatus {
  switch ((raw ?? "").trim().toLowerCase()) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "unpaid":
      return "unpaid";
    case "incomplete":
    case "incomplete_expired":
      return "incomplete";
    case "paused":
      return "paused";
    case "canceled":
    case "cancelled":
    case "expired":
      return "canceled";
    default:
      // Safe default: never leave paid access open on an unknown status.
      return "canceled";
  }
}

/** Map a Creem eventType to the entitlement action kind. */
export function kindFromCreemEvent(eventType: string): BillingEventKind {
  switch (eventType) {
    case "subscription.active":
    case "subscription.paid":
    case "subscription.trialing":
      return "activated";
    case "subscription.update":
    case "subscription.scheduled_cancel":
    case "subscription.paused":
      return "updated";
    case "subscription.canceled":
    case "subscription.expired":
    case "refund.created":
    case "dispute.created":
      return "revoked";
    case "subscription.past_due":
      return "past_due";
    default:
      return "ignored";
  }
}

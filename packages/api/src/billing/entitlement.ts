import type { PlanKey, SubscriptionStatus } from "./types";

/** Statuses that keep a workspace on its paid plan. */
export function isEntitledStatus(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}

/**
 * Map a neutral planKey to the existing workspace_plan enum value.
 *
 * The enum rename (team->standard, pro->premium) is intentionally deferred: it
 * would touch many callers and require a risky enum-value migration. The neutral
 * planKey is persisted separately on the subscription row, so entitlement stays
 * provider-neutral while workspace.plan keeps its current vocabulary.
 */
export function workspacePlanFromKey(
  planKey: PlanKey | null,
): "free" | "team" | "pro" {
  switch (planKey) {
    case "standard":
      return "team";
    case "premium":
      return "pro";
    default:
      return "free";
  }
}

/**
 * Resolve the workspace_plan value a subscription should grant, given its
 * neutral status + planKey. Non-entitled statuses (canceled, past_due, unpaid,
 * incomplete, paused) always drop to "free" — access is revoked unless a
 * verified active/trialing status is present.
 */
export function workspacePlanForSubscription(
  status: SubscriptionStatus,
  planKey: PlanKey | null,
): "free" | "team" | "pro" {
  return isEntitledStatus(status) ? workspacePlanFromKey(planKey) : "free";
}

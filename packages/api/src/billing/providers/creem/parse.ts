import type { NeutralSubscription, NeutralWebhookEvent } from "../../types";
import { planFromCreemProductId } from "./config";
import { kindFromCreemEvent, mapCreemStatus } from "./status";

// Creem webhook envelope: { id, eventType, created_at, object }
// See docs.creem.io/code/webhooks (verified 2026-07-18).
interface CreemEnvelope {
  id?: string;
  eventType?: string;
  created_at?: number;
  object?: Record<string, unknown>;
}

function readString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function nestedId(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "id" in v) {
    const id = (v as { id?: unknown }).id;
    return typeof id === "string" ? id : undefined;
  }
  return undefined;
}

function toDate(v: unknown): Date | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Parse a verified Creem webhook body into a neutral event. Pure — assumes the
 * signature was already checked by the caller.
 */
export function parseCreemEvent(rawBody: string): NeutralWebhookEvent {
  const env = JSON.parse(rawBody) as CreemEnvelope;
  const eventType = env.eventType ?? "";
  const obj = env.object ?? {};
  const kind = kindFromCreemEvent(eventType);

  const productId = nestedId(obj.product) ?? readString(obj.product_id);
  const mapped = planFromCreemProductId(productId);
  const meta = (obj.metadata ?? {}) as Record<string, string>;
  const subId =
    readString(obj.id) ??
    nestedId(obj.subscription) ??
    readString(obj.subscription_id);

  let subscription: NeutralSubscription | null = null;
  if (subId) {
    subscription = {
      provider: "creem",
      providerCustomerId:
        nestedId(obj.customer) ?? readString(obj.customer_id) ?? "",
      providerSubscriptionId: subId,
      providerProductId: productId ?? "",
      planKey: mapped?.plan ?? null,
      period: mapped?.period ?? null,
      status: mapCreemStatus(readString(obj.status)),
      currentPeriodEnd: toDate(obj.current_period_end_date),
      cancelAtPeriodEnd:
        eventType === "subscription.scheduled_cancel" ||
        obj.cancel_at_period_end === true,
      seats: typeof obj.units === "number" ? obj.units : null,
      workspacePublicId:
        typeof meta.workspacePublicId === "string"
          ? meta.workspacePublicId
          : null,
    };
  }

  return {
    eventId: env.id ?? "",
    eventAt: typeof env.created_at === "number" ? env.created_at : 0,
    rawType: eventType,
    kind,
    subscription,
  };
}

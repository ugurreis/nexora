import type { NextApiRequest, NextApiResponse } from "next";
import type { Readable } from "node:stream";

import { workspacePlanForSubscription } from "@kan/api/billing/entitlement";
import { getBillingGateway } from "@kan/api/billing/gateway";
import { BillingSignatureError } from "@kan/api/billing/types";
import { createNextApiContext } from "@kan/api/trpc";
import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { createLogger } from "@kan/logger";

// Raw body is required for signature verification.
export const config = { api: { bodyParser: false } };

const log = createLogger("api");

async function buffer(readable: Readable) {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const rawBody = (await buffer(req)).toString("utf8");
  const gateway = getBillingGateway();

  // Signature is verified BEFORE any parsing/DB work. Invalid -> 401, no writes.
  let event;
  try {
    event = gateway.verifyAndParseWebhook({ rawBody, headers: req.headers });
  } catch (err) {
    if (err instanceof BillingSignatureError) {
      return res.status(401).json({ message: "Invalid signature" });
    }
    log.error({ err }, "Billing webhook parse failed");
    return res.status(400).json({ message: "Invalid payload" });
  }

  // Events without an actionable subscription (e.g. checkout.completed) or
  // without workspace metadata cannot grant/revoke — ack so the provider does
  // not retry a permanently-unactionable event.
  const sub = event.subscription;
  if (event.kind === "ignored" || !sub || !sub.workspacePublicId) {
    log.info(
      { eventId: event.eventId, type: event.rawType },
      "Billing webhook: no-op",
    );
    return res.status(200).json({ received: true });
  }

  try {
    const { db } = await createNextApiContext(req);
    const workspacePublicId = sub.workspacePublicId;

    const workspace = await workspaceRepo.getByPublicId(db, workspacePublicId);
    if (!workspace) {
      log.warn(
        { eventId: event.eventId, workspacePublicId },
        "Billing webhook: unknown workspace",
      );
      return res.status(200).json({ received: true });
    }

    // Entitlement is derived from the verified status: active/trialing keep the
    // paid plan; anything else (canceled, past_due, unpaid, ...) revokes to free.
    const workspacePlan = workspacePlanForSubscription(sub.status, sub.planKey);

    const result = await subscriptionRepo.applyProviderWebhookEvent(db, {
      eventId: event.eventId,
      eventAt: event.eventAt,
      provider: sub.provider,
      providerSubscriptionId: sub.providerSubscriptionId,
      providerCustomerId: sub.providerCustomerId,
      providerProductId: sub.providerProductId,
      referenceId: workspacePublicId,
      planKey: sub.planKey,
      billingPeriod: sub.period,
      status: sub.status,
      plan: workspacePlan,
      seats: sub.seats,
      periodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    });

    // Duplicate/stale delivery: the row already reflects this-or-newer state.
    // Do NOT touch workspace.plan (it may hold newer entitlement).
    if (!result.applied) {
      log.info(
        { eventId: event.eventId, reason: result.reason },
        "Billing webhook: skipped (idempotent)",
      );
      return res.status(200).json({ received: true });
    }

    await workspaceRepo.update(db, workspacePublicId, { plan: workspacePlan });
    log.info(
      { eventId: event.eventId, type: event.rawType, plan: workspacePlan },
      "Billing webhook: applied",
    );
    return res.status(200).json({ received: true });
  } catch (err) {
    // Unexpected/transient (e.g. DB) -> 500 so the provider retries. The upsert
    // is idempotent, so retry is safe.
    log.error(
      { err, eventId: event.eventId },
      "Billing webhook processing failed",
    );
    return res.status(500).json({ message: "Processing failed" });
  }
}

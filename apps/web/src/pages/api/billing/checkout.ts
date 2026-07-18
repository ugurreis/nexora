import { randomUUID } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { env } from "next-runtime-env";
import { z } from "zod";

import { getBillingGateway } from "@kan/api/billing/gateway";
import { createNextApiContext } from "@kan/api/trpc";
import { withApiLogging } from "@kan/api/utils/apiLogging";
import { assertPermission } from "@kan/api/utils/permissions";
import { withRateLimit } from "@kan/api/utils/rateLimit";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

// Plan + period come from the client, but the product id and secret are
// resolved server-side (see billing/providers/creem/config). Client-supplied
// price/product values are never trusted.
const bodySchema = z.object({
  plan: z.enum(["standard", "premium"]),
  billingPeriod: z.enum(["monthly", "yearly"]),
  workspacePublicId: z.string().min(1),
});

export default withRateLimit(
  { points: 100, duration: 60 },
  withApiLogging(async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { user, db } = await createNextApiContext(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request" });
    }
    const { plan, billingPeriod, workspacePublicId } = parsed.data;

    // IDOR guard: the user must be able to manage this workspace.
    const workspace = await workspaceRepo.getByPublicId(db, workspacePublicId);
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    try {
      await assertPermission(db, user.id, workspace.id, "workspace:manage");
    } catch {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Success URL allowlist: built server-side from the trusted base URL, never
    // taken from client input.
    const baseUrl = env("NEXT_PUBLIC_BASE_URL") ?? "";
    const successUrl = `${baseUrl}/settings?billing=success`;

    try {
      const gateway = getBillingGateway();
      const { url } = await gateway.createCheckoutSession({
        plan,
        period: billingPeriod,
        seats: 1, // flat plan: price is per-subscription, not per-seat
        successUrl,
        requestId: randomUUID(),
        metadata: {
          workspacePublicId,
          userId: user.id,
          plan,
          billingPeriod,
        },
        customerEmail: user.email,
      });
      return res.status(200).json({ url });
    } catch (err) {
      return res.status(502).json({ error: "Checkout creation failed" });
    }
  }),
);

import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { getBillingGateway } from "@kan/api/billing/gateway";
import { createNextApiContext } from "@kan/api/trpc";
import { withApiLogging } from "@kan/api/utils/apiLogging";
import { assertPermission } from "@kan/api/utils/permissions";
import { withRateLimit } from "@kan/api/utils/rateLimit";
import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

const bodySchema = z.object({ workspacePublicId: z.string().min(1) });

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
    const { workspacePublicId } = parsed.data;

    // IDOR guard: only a manager of this workspace may open its portal.
    const workspace = await workspaceRepo.getByPublicId(db, workspacePublicId);
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    try {
      await assertPermission(db, user.id, workspace.id, "workspace:manage");
    } catch {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Only ever expose the billing customer tied to THIS workspace.
    const subs = await subscriptionRepo.getByReferenceId(db, workspacePublicId);
    const providerCustomerId = subs.find(
      (s) => s.provider && s.providerCustomerId,
    )?.providerCustomerId;
    if (!providerCustomerId) {
      return res.status(404).json({ error: "No billing account found" });
    }

    try {
      const gateway = getBillingGateway();
      const { url } = await gateway.createPortalSession({ providerCustomerId });
      return res.status(200).json({ url });
    } catch (err) {
      return res.status(502).json({ error: "Portal creation failed" });
    }
  }),
);

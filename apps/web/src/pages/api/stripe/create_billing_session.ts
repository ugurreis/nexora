import type { NextApiRequest, NextApiResponse } from "next";

// Deprecated. Superseded by /api/billing/portal. Kept as an explicit 410 marker
// so any stale caller fails loudly instead of reaching dead Stripe code.
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    error: "Stripe billing portal is deprecated. Use /api/billing/portal.",
  });
}

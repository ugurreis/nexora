import type { NextApiRequest, NextApiResponse } from "next";

// Deprecated. Superseded by the signed provider-neutral webhook at
// /api/billing/webhook. Kept as an explicit 410 marker; no Stripe webhook is
// configured against this app. Safe to remove with the rest of the legacy
// Stripe coupling.
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    error: "Stripe webhook is deprecated. Use /api/billing/webhook.",
  });
}

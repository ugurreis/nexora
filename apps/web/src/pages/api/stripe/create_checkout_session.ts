import type { NextApiRequest, NextApiResponse } from "next";

// Deprecated. Superseded by the provider-neutral billing boundary at
// /api/billing/checkout. Kept as an explicit 410 marker so any stale caller
// fails loudly instead of reaching dead Stripe code. Safe to remove once the
// legacy @kan/stripe + @better-auth/stripe coupling is retired.
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    error: "Stripe checkout is deprecated. Use /api/billing/checkout.",
  });
}

import * as crypto from "crypto";

/**
 * Verify a Creem webhook signature.
 * HMAC-SHA256(rawBody, secret) as hex, compared to the `creem-signature` header.
 * Timing-safe; returns false for a missing signature or length mismatch.
 */
export function verifyCreemSignature(
  rawBody: string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature) return false;
  const computed = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

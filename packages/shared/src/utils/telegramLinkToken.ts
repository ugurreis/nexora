import { createHmac, timingSafeEqual } from "crypto";

interface TokenPayload {
  userId: string;
  exp: number; // unix seconds
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payload: string, secret: string): string {
  return base64url(createHmac("sha256", secret).update(payload).digest());
}

export function signTelegramLinkToken(
  userId: string,
  secret: string,
  ttlSeconds = 600,
): string {
  const payload: TokenPayload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payloadEncoded = base64url(JSON.stringify(payload));
  const signature = sign(payloadEncoded, secret);
  return `${payloadEncoded}.${signature}`;
}

export function verifyTelegramLinkToken(
  token: string,
  secret: string,
): { userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadEncoded, signature] = parts as [string, string];

  const expectedSignature = sign(payloadEncoded, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: TokenPayload;
  try {
    payload = JSON.parse(
      Buffer.from(payloadEncoded, "base64").toString("utf8"),
    ) as TokenPayload;
  } catch {
    return null;
  }

  if (typeof payload.userId !== "string" || typeof payload.exp !== "number")
    return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return { userId: payload.userId };
}

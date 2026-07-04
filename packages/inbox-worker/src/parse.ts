import { convert } from "html-to-text";

const MAX_TITLE = 512;
const MAX_BODY = 20000;
const TOKEN_RE = /inbox\+([a-z0-9]{1,64})@/i;

export function parseRecipientToken(headers: {
  to?: string | null;
  deliveredTo?: string | null;
  xOriginalTo?: string | null;
}): string | null {
  for (const value of [headers.deliveredTo, headers.xOriginalTo, headers.to]) {
    if (!value) continue;
    const match = TOKEN_RE.exec(value);
    if (match?.[1]) return match[1].toLowerCase();
  }
  return null;
}

export function extractEmail(value?: string | null): string | null {
  if (!value) return null;
  const bracket = /<([^>]+)>/.exec(value);
  const raw = (bracket?.[1] ?? value).trim();
  return raw.includes("@") ? raw : null;
}

export function buildTitle(subject?: string | null): string {
  const trimmed = (subject ?? "").trim();
  if (!trimmed) return "(Konusuz)";
  return trimmed.slice(0, MAX_TITLE);
}

export function buildDescription(input: {
  text?: string | null;
  html?: string | null;
}): string | null {
  let body = (input.text ?? "").trim();
  if (!body && input.html) {
    body = convert(input.html, { wordwrap: false }).trim();
  }
  if (!body) return null;
  return body.slice(0, MAX_BODY);
}

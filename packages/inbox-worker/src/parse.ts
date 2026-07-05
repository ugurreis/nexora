import { convert } from "html-to-text";

const MAX_TITLE = 512;
const MAX_BODY = 20000;
const TOKEN_RE = /inbox\+([a-z0-9]{1,64})@/i;

// Postgres text/varchar columns reject a NUL byte (code point 0) outright and
// choke on other C0 control bytes. A malformed email carrying them would make
// the inboxItem insert throw on every poll; because the IMAP loop only marks a
// message \Seen after a successful process, that throw becomes an infinite
// reprocess loop that blocks the entire inbox behind the poison message. Strip
// the control chars before they ever reach the insert. Tab (0x09), newline
// (0x0A) and carriage return (0x0D) are legitimate body whitespace and kept.
function stripControlChars(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    const isForbiddenC0 =
      code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d;
    if (isForbiddenC0 || code === 0x7f) continue;
    out += ch;
  }
  return out;
}

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
  const trimmed = stripControlChars(subject ?? "").trim();
  if (!trimmed) return "(Konusuz)";
  return trimmed.slice(0, MAX_TITLE);
}

export function buildDescription(input: {
  text?: string | null;
  html?: string | null;
}): string | null {
  let body = stripControlChars(input.text ?? "").trim();
  if (!body && input.html) {
    // html-to-text can throw on pathological markup. A throw here would bubble
    // out of processMessage, skip the \Seen mark, and (single shared mailbox)
    // wedge the whole inbox on retry. Treat a conversion failure as "no body"
    // rather than letting it become a poison message.
    try {
      body = stripControlChars(convert(input.html, { wordwrap: false })).trim();
    } catch {
      body = "";
    }
  }
  if (!body) return null;
  return body.slice(0, MAX_BODY);
}

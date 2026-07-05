export interface WorkerConfig {
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  pollSeconds: number;
  requireFromMatch: boolean;
  maxPerHour: number;
  enabled: boolean;
}

// A non-numeric env value makes Number() return NaN. That silently breaks
// downstream logic: NaN maxPerHour turns "recent >= maxPerHour" always false
// (rate limiting off), and NaN pollSeconds makes setTimeout fire immediately
// (busy loop). Fall back to the documented default on any non-positive/NaN.
function positiveIntEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(): WorkerConfig {
  const imapHost = process.env.INBOX_IMAP_HOST ?? "";
  const imapUser = process.env.INBOX_IMAP_USER ?? "";
  const imapPassword = process.env.INBOX_IMAP_PASSWORD ?? "";

  return {
    imapHost,
    imapPort: positiveIntEnv(process.env.INBOX_IMAP_PORT, 993),
    imapUser,
    imapPassword,
    pollSeconds: positiveIntEnv(process.env.INBOX_POLL_SECONDS, 60),
    requireFromMatch:
      (process.env.INBOX_REQUIRE_FROM_MATCH ?? "true") !== "false",
    maxPerHour: positiveIntEnv(
      process.env.INBOX_MAX_ITEMS_PER_USER_PER_HOUR,
      100,
    ),
    enabled: Boolean(imapHost && imapUser && imapPassword),
  };
}

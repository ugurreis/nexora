import { createDrizzleClient } from "@kan/db/client";
import { createLogger } from "@kan/logger";

import { loadConfig } from "./config";
import { buildImapClient, runOnce } from "./imap";

const logger = createLogger("inbox-worker");

async function main() {
  const config = loadConfig();

  if (!config.enabled) {
    logger.warn(
      "INBOX_IMAP_* not fully configured — inbox email worker is disabled (no-op).",
    );
    // Konteyner canlı kalsın ama hiçbir şey yapmasın.
    setInterval(() => undefined, 1 << 30);
    return;
  }

  // The shared @kan/db client silently falls back to an ephemeral PGLite
  // store when POSTGRES_URL is unset (convenient for the web app's zero-config
  // quick-start). The worker must never run against that fallback: it would
  // mark emails \Seen (permanent, on the mail server) while writing cards to a
  // database that vanishes on container restart — silent, unrecoverable mail
  // loss. Fail fast instead.
  if (!process.env.POSTGRES_URL) {
    throw new Error(
      "POSTGRES_URL is not set — refusing to start inbox worker against the ephemeral PGLite fallback (would silently lose processed emails).",
    );
  }

  const db = createDrizzleClient();
  logger.info(
    { host: config.imapHost, pollSeconds: config.pollSeconds },
    "inbox worker starting",
  );

  let backoff = 1000;
  const maxBackoff = 60000;

  // Sonsuz döngü: bağlan → tur → çık → bekle. Hata olursa exponential backoff.
  for (;;) {
    const client = buildImapClient(config);
    try {
      await client.connect();
      await runOnce(db, client, {
        requireFromMatch: config.requireFromMatch,
        maxPerHour: config.maxPerHour,
      });
      await client.logout();
      // Reset backoff only after a fully successful cycle. Resetting right
      // after connect() would keep backoff at 1s forever if connect always
      // succeeds but runOnce always throws — starving the exponential backoff.
      backoff = 1000;
      await sleep(config.pollSeconds * 1000);
    } catch (error) {
      logger.error({ error }, "inbox worker poll failed; backing off");
      try {
        await client.close();
      } catch {
        // yoksay
      }
      await sleep(backoff);
      backoff = Math.min(backoff * 2, maxBackoff);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  // main() only returns via an unrecoverable startup error (loadConfig /
  // createDrizzleClient); the poll loop itself never resolves. Surface it and
  // exit non-zero so the orchestrator restarts the container instead of it
  // sitting dead with a silently swallowed rejection.
  logger.error({ error }, "inbox worker crashed on startup");
  process.exit(1);
});

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
      backoff = 1000;
      await runOnce(db, client, {
        requireFromMatch: config.requireFromMatch,
        maxPerHour: config.maxPerHour,
      });
      await client.logout();
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

void main();

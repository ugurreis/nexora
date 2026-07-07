import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDrizzleClient } from "@kan/db/client";
import * as telegramLinkRepo from "./telegramLink.repo";
import { users } from "@kan/db/schema";
import { eq } from "drizzle-orm";

const db = createDrizzleClient();

describe("telegramLink.repo", () => {
  let userId: string;

  beforeAll(async () => {
    const [user] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        name: "Test User",
        email: `test-${randomUUID()}@example.com`,
        emailVerified: false,
      })
      .returning({ id: users.id });
    userId = user!.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
  });

  it("consumePendingBatch only succeeds once", async () => {
    const created = await telegramLinkRepo.createPendingBatch(db, {
      userId,
      payload: JSON.stringify([{ title: "test" }]),
      expiresAt: new Date(Date.now() + 60_000),
    });
    expect(created?.publicId).toBeTruthy();

    const first = await telegramLinkRepo.consumePendingBatch(
      db,
      created!.publicId,
    );
    expect(first?.userId).toBe(userId);

    const second = await telegramLinkRepo.consumePendingBatch(
      db,
      created!.publicId,
    );
    expect(second).toBeUndefined();
  });
});

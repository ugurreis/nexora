import { and, count, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

import type { dbClient } from "@kan/db/client";
import { account, apikey, users } from "@kan/db/schema";

const PROVIDER_CREDENTIAL = "credential";
const PROVIDER_MAGIC_LINK = "magic-link";

export const getCount = async (db: dbClient) => {
  const result = await db.select({ count: count() }).from(users);

  return result[0]?.count ?? 0;
};

export const getById = async (db: dbClient, userId: string) => {
  const [user, credentialAccount, magicLinkAccount] = await Promise.all([
    db.query.users.findFirst({
      columns: {
        id: true,
        name: true,
        email: true,
        image: true,
        stripeCustomerId: true,
      },
      with: {
        apiKeys: {
          columns: {
            id: true,
            prefix: true,
            key: true,
          },
          orderBy: desc(apikey.createdAt),
          limit: 1,
        },
      },
      where: eq(users.id, userId),
    }),
    db
      .select({ id: account.id })
      .from(account)
      .where(
        and(
          eq(account.userId, userId),
          eq(account.providerId, PROVIDER_CREDENTIAL),
          isNotNull(account.password),
        ),
      )
      .limit(1),
    db
      .select({ id: account.id })
      .from(account)
      .where(
        and(
          eq(account.userId, userId),
          eq(account.providerId, PROVIDER_MAGIC_LINK),
        ),
      )
      .limit(1),
  ]);

  if (!user) return undefined;

  return {
    ...user,
    hasPassword: credentialAccount.length > 0,
    hasMagicLinkAccount: magicLinkAccount.length > 0,
  };
};

export const getByStripeCustomerId = async (
  db: dbClient,
  stripeCustomerId: string,
) => {
  return await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, stripeCustomerId),
  });
};

export const getByEmail = (db: dbClient, email: string) => {
  return db.query.users.findFirst({
    columns: {
      id: true,
      name: true,
      email: true,
    },
    where: eq(users.email, email),
  });
};

export const create = async (
  db: dbClient,
  user: { id?: string; email: string; stripeCustomerId?: string },
) => {
  const [result] = await db
    .insert(users)
    .values({
      id: user.id ?? uuidv4(),
      email: user.email,
      stripeCustomerId: user.stripeCustomerId,
      emailVerified: false,
    })
    .returning();

  return result;
};

export const update = async (
  db: dbClient,
  userId: string,
  updates: { image?: string; name?: string; stripeCustomerId?: string },
) => {
  const [result] = await db
    .update(users)
    .set({
      name: updates.name,
      image: updates.image,
      stripeCustomerId: updates.stripeCustomerId,
    })
    .where(eq(users.id, userId))
    .returning({
      name: users.name,
      image: users.image,
      stripeCustomerId: users.stripeCustomerId,
    });

  return result;
};

export const getByInboxEmailToken = async (db: dbClient, token: string) => {
  return db.query.users.findFirst({
    columns: { id: true, email: true, inboxEmailToken: true },
    where: eq(users.inboxEmailToken, token),
  });
};

export const getInboxEmailToken = async (db: dbClient, userId: string) => {
  const row = await db.query.users.findFirst({
    columns: { inboxEmailToken: true },
    where: eq(users.id, userId),
  });

  return row?.inboxEmailToken ?? null;
};

// Only mints if the user has no token yet (WHERE ... IS NULL). Two concurrent
// first-time calls would otherwise both read null, both write a *different*
// token, and the loser's address (already returned to its caller) becomes
// permanently invalid — silent mail loss. Returns undefined if another
// request won the race; the caller should re-read the now-set token.
export const setInboxEmailToken = async (
  db: dbClient,
  userId: string,
  token: string,
) => {
  const [result] = await db
    .update(users)
    .set({ inboxEmailToken: token })
    .where(and(eq(users.id, userId), isNull(users.inboxEmailToken)))
    .returning({ inboxEmailToken: users.inboxEmailToken });

  return result;
};

/** Unconditional overwrite — used when a user picks their own inbox alias. */
export const updateInboxEmailToken = async (
  db: dbClient,
  userId: string,
  token: string,
) => {
  const [result] = await db
    .update(users)
    .set({ inboxEmailToken: token })
    .where(eq(users.id, userId))
    .returning({ inboxEmailToken: users.inboxEmailToken });

  return result;
};

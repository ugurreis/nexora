import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "./config";

const ENV_KEYS = [
  "INBOX_IMAP_HOST",
  "INBOX_IMAP_USER",
  "INBOX_IMAP_PASSWORD",
  "INBOX_IMAP_PORT",
  "INBOX_POLL_SECONDS",
  "INBOX_MAX_ITEMS_PER_USER_PER_HOUR",
  "INBOX_REQUIRE_FROM_MATCH",
] as const;

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("loadConfig numeric parsing", () => {
  it("uses defaults when numeric envs are unset", () => {
    const cfg = loadConfig();
    expect(cfg.imapPort).toBe(993);
    expect(cfg.pollSeconds).toBe(60);
    expect(cfg.maxPerHour).toBe(100);
  });

  it("falls back to defaults on non-numeric values instead of NaN", () => {
    process.env.INBOX_IMAP_PORT = "abc";
    process.env.INBOX_POLL_SECONDS = "not-a-number";
    process.env.INBOX_MAX_ITEMS_PER_USER_PER_HOUR = "";
    const cfg = loadConfig();
    expect(cfg.imapPort).toBe(993);
    expect(cfg.pollSeconds).toBe(60);
    // Critical: a NaN maxPerHour would make "recent >= maxPerHour" always
    // false and silently disable rate limiting.
    expect(cfg.maxPerHour).toBe(100);
    expect(Number.isNaN(cfg.maxPerHour)).toBe(false);
  });

  it("falls back on non-positive values", () => {
    process.env.INBOX_POLL_SECONDS = "0";
    process.env.INBOX_MAX_ITEMS_PER_USER_PER_HOUR = "-5";
    const cfg = loadConfig();
    expect(cfg.pollSeconds).toBe(60);
    expect(cfg.maxPerHour).toBe(100);
  });

  it("honours valid numeric overrides", () => {
    process.env.INBOX_IMAP_PORT = "1993";
    process.env.INBOX_POLL_SECONDS = "30";
    process.env.INBOX_MAX_ITEMS_PER_USER_PER_HOUR = "50";
    const cfg = loadConfig();
    expect(cfg.imapPort).toBe(1993);
    expect(cfg.pollSeconds).toBe(30);
    expect(cfg.maxPerHour).toBe(50);
  });
});

import { describe, expect, it } from "vitest";

import {
  buildDescription,
  buildTitle,
  extractEmail,
  parseRecipientToken,
} from "./parse";

const NUL = String.fromCharCode(0);
const BEL = String.fromCharCode(7);
const UNIT_SEP = String.fromCharCode(0x1f);
const DEL = String.fromCharCode(0x7f);

describe("parseRecipientToken", () => {
  it("extracts token from To header", () => {
    expect(
      parseRecipientToken({ to: "Nexora <inbox+abc123XYZ@nexovias.com>" }),
    ).toBe("abc123xyz");
  });

  it("prefers Delivered-To / X-Original-To over To", () => {
    expect(
      parseRecipientToken({
        to: "inbox@nexovias.com",
        deliveredTo: "inbox+realtoken@nexovias.com",
      }),
    ).toBe("realtoken");
  });

  it("returns null when there is no plus-token", () => {
    expect(parseRecipientToken({ to: "inbox@nexovias.com" })).toBeNull();
    expect(parseRecipientToken({})).toBeNull();
  });
});

describe("extractEmail", () => {
  it("pulls address out of a display-name form", () => {
    expect(extractEmail("Ada L <ada@example.com>")).toBe("ada@example.com");
  });
  it("returns bare address as-is", () => {
    expect(extractEmail("ada@example.com")).toBe("ada@example.com");
  });
  it("returns null for empty/invalid", () => {
    expect(extractEmail(null)).toBeNull();
    expect(extractEmail("not-an-email")).toBeNull();
  });
});

describe("buildTitle", () => {
  it("uses the subject trimmed", () => {
    expect(buildTitle("  Buy milk  ")).toBe("Buy milk");
  });
  it("falls back to (Konusuz) when empty", () => {
    expect(buildTitle("")).toBe("(Konusuz)");
    expect(buildTitle(null)).toBe("(Konusuz)");
  });
  it("truncates to 512 chars", () => {
    expect(buildTitle("x".repeat(600))).toHaveLength(512);
  });
  it("strips NUL / C0 controls / DEL that Postgres rejects", () => {
    expect(buildTitle(`Buy${NUL} mi${BEL}lk${UNIT_SEP}${DEL}`)).toBe("Buy milk");
  });
  it("keeps tab/newline/CR as whitespace then trims", () => {
    expect(buildTitle("\tHello\r\n")).toBe("Hello");
  });
});

describe("buildDescription", () => {
  it("prefers plain text", () => {
    expect(buildDescription({ text: "hello", html: "<b>hi</b>" })).toBe("hello");
  });
  it("converts HTML when no text", () => {
    expect(buildDescription({ html: "<p>hello <b>world</b></p>" })).toContain(
      "hello world",
    );
  });
  it("returns null when both empty", () => {
    expect(buildDescription({})).toBeNull();
  });
  it("truncates to 20000 chars", () => {
    expect(buildDescription({ text: "y".repeat(25000) })).toHaveLength(20000);
  });
  it("strips NUL from the body before it reaches the DB", () => {
    expect(buildDescription({ text: `line1${NUL}line2` })).toBe("line1line2");
  });
});

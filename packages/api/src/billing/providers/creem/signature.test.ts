import * as crypto from "crypto";
import { describe, expect, it } from "vitest";

import { verifyCreemSignature } from "./signature";

const secret = "whsec_test";
const body = JSON.stringify({ eventType: "subscription.active", id: "evt_1" });
const good = crypto.createHmac("sha256", secret).update(body).digest("hex");

describe("verifyCreemSignature", () => {
  it("accepts a correct signature", () => {
    expect(verifyCreemSignature(body, good, secret)).toBe(true);
  });

  it("rejects a wrong signature", () => {
    expect(verifyCreemSignature(body, "deadbeef", secret)).toBe(false);
  });

  it("rejects an undefined signature", () => {
    expect(verifyCreemSignature(body, undefined, secret)).toBe(false);
  });

  it("rejects when the body was tampered", () => {
    expect(verifyCreemSignature(body + " ", good, secret)).toBe(false);
  });

  it("rejects when the secret is wrong", () => {
    expect(verifyCreemSignature(body, good, "whsec_other")).toBe(false);
  });
});

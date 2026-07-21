import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BillingConfigError } from "../../types";
import {
  creemApiBase,
  planFromCreemProductId,
  resolveCreemProductId,
} from "./config";

const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env.CREEM_PRODUCT_STANDARD_MONTHLY = "prod_sm";
  process.env.CREEM_PRODUCT_STANDARD_YEARLY = "prod_sy";
  process.env.CREEM_PRODUCT_PREMIUM_MONTHLY = "prod_pm";
  process.env.CREEM_PRODUCT_PREMIUM_YEARLY = "prod_py";
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("resolveCreemProductId (server config only)", () => {
  it("resolves standard monthly", () => {
    expect(resolveCreemProductId("standard", "monthly")).toBe("prod_sm");
  });

  it("resolves premium yearly", () => {
    expect(resolveCreemProductId("premium", "yearly")).toBe("prod_py");
  });

  it("throws BillingConfigError when the env var is missing", () => {
    delete process.env.CREEM_PRODUCT_PREMIUM_MONTHLY;
    expect(() => resolveCreemProductId("premium", "monthly")).toThrow(
      BillingConfigError,
    );
  });
});

describe("planFromCreemProductId (reverse map)", () => {
  it("reverse-maps a known product id", () => {
    expect(planFromCreemProductId("prod_py")).toEqual({
      plan: "premium",
      period: "yearly",
    });
  });

  it("returns null for an unknown product id", () => {
    expect(planFromCreemProductId("prod_unknown")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(planFromCreemProductId(undefined)).toBeNull();
  });
});

describe("creemApiBase", () => {
  it("defaults to the production base", () => {
    delete process.env.CREEM_API_BASE;
    expect(creemApiBase()).toBe("https://api.creem.io");
  });
});

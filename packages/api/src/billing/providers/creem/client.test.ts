import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BillingProviderError } from "../../types";
import { createCreemCheckout, createCreemPortal } from "./client";

const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env.CREEM_API_KEY = "creem_test";
  process.env.CREEM_API_BASE = "https://api.creem.io";
  process.env.CREEM_PRODUCT_STANDARD_MONTHLY = "prod_sm";
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL };
});

describe("createCreemCheckout", () => {
  it("POSTs product_id + units server-side and returns checkout_url", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ checkout_url: "https://creem.io/checkout/xyz" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createCreemCheckout({
      plan: "standard",
      period: "monthly",
      seats: 4,
      successUrl: "https://nexora.nexovias.com/billing/return",
      metadata: { workspacePublicId: "ws1" },
      requestId: "req1",
    });

    expect(result.checkoutUrl).toBe("https://creem.io/checkout/xyz");
    const call = fetchMock.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string>; body: string },
    ];
    const url = call[0];
    const opts = call[1];
    expect(url).toBe("https://api.creem.io/v1/checkouts");
    expect(opts.headers["x-api-key"]).toBe("creem_test");
    const sent = JSON.parse(opts.body) as Record<string, unknown>;
    expect(sent.product_id).toBe("prod_sm");
    expect(sent.units).toBe(4);
    expect(sent.request_id).toBe("req1");
  });

  it("throws BillingProviderError on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 400, text: async () => "bad" })),
    );
    await expect(
      createCreemCheckout({
        plan: "standard",
        period: "monthly",
        seats: 1,
        successUrl: "https://x/return",
        metadata: {},
        requestId: "r",
      }),
    ).rejects.toBeInstanceOf(BillingProviderError);
  });
});

describe("createCreemPortal", () => {
  it("POSTs customer_id and returns the portal link", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        customer_portal_link: "https://creem.io/my-orders/login/abc",
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createCreemPortal({ providerCustomerId: "cus_9" });
    expect(result.portalUrl).toBe("https://creem.io/my-orders/login/abc");
    const call = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
    const url = call[0];
    const opts = call[1];
    expect(url).toBe("https://api.creem.io/v1/customers/billing");
    expect((JSON.parse(opts.body) as { customer_id: string }).customer_id).toBe(
      "cus_9",
    );
  });
});

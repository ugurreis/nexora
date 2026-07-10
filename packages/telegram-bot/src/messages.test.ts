import { describe, expect, it } from "vitest";

import { confirmSummary, messages, t } from "./messages";

describe("t", () => {
  it("returns the tr string for locale 'tr'", () => {
    expect(t("listening", "tr")).toBe(messages.listening.tr);
  });

  it("returns the en string for locale 'en'", () => {
    expect(t("listening", "en")).toBe(messages.listening.en);
  });

  it("falls back to tr when locale is null", () => {
    expect(t("listening", null)).toBe(messages.listening.tr);
  });
});

describe("confirmSummary", () => {
  it("formats a Turkish summary with no failures", () => {
    expect(
      confirmSummary("tr", { createdCount: 2, inboxCount: 1, failedCount: 0 }),
    ).toBe("2 kart oluşturuldu, 1 tanesi Gelen Kutusu'na düştü.");
  });

  it("formats an English summary with failures", () => {
    expect(
      confirmSummary("en", { createdCount: 2, inboxCount: 1, failedCount: 1 }),
    ).toBe("2 card(s) created, 1 sent to Inbox, 1 failed.");
  });

  it("falls back to tr when locale is null", () => {
    expect(
      confirmSummary(null, { createdCount: 1, inboxCount: 0, failedCount: 0 }),
    ).toBe("1 kart oluşturuldu, 0 tanesi Gelen Kutusu'na düştü.");
  });
});

import { describe, expect, it } from "vitest";

import { mapWhisperLanguage } from "./locale";

describe("mapWhisperLanguage", () => {
  it("maps 'english' to en", () => {
    expect(mapWhisperLanguage("english")).toBe("en");
  });

  it("maps 'turkish' to tr", () => {
    expect(mapWhisperLanguage("turkish")).toBe("tr");
  });

  it("is case-insensitive", () => {
    expect(mapWhisperLanguage("English")).toBe("en");
  });

  it("falls back to tr for an unrecognized language", () => {
    expect(mapWhisperLanguage("french")).toBe("tr");
  });

  it("falls back to tr for an empty string", () => {
    expect(mapWhisperLanguage("")).toBe("tr");
  });
});

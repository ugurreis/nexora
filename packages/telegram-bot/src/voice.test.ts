import { describe, expect, it, vi } from "vitest";

import { downloadTelegramFile } from "./voice";

describe("downloadTelegramFile", () => {
  it("resolves the file_path via getFile then downloads the bytes", async () => {
    const getFile = vi.fn().mockResolvedValue({ file_path: "voice/file1.oga" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await downloadTelegramFile("BOT_TOKEN", "file-id-1", getFile);

    expect(getFile).toHaveBeenCalledWith("file-id-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.telegram.org/file/botBOT_TOKEN/voice/file1.oga",
    );
    expect(result).toEqual(Buffer.from([1, 2, 3]));

    vi.unstubAllGlobals();
  });

  it("throws when Telegram returns no file_path", async () => {
    const getFile = vi.fn().mockResolvedValue({});
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      downloadTelegramFile("BOT_TOKEN", "file-id-1", getFile),
    ).rejects.toThrow("Telegram getFile returned no file_path");

    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

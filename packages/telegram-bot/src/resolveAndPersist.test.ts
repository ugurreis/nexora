import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./segment", () => ({ segmentTranscript: vi.fn() }));
vi.mock("@kan/db/repository/telegramLink.repo", () => ({
  createPendingBatch: vi.fn(),
}));
vi.mock("@kan/db/repository/board.repo", () => ({
  getAssignableContextByUserId: vi.fn(),
}));

import * as boardRepo from "@kan/db/repository/board.repo";
import * as telegramLinkRepo from "@kan/db/repository/telegramLink.repo";
import { segmentTranscript } from "./segment";
import { formatSummary, resolveAndPersist } from "./resolveAndPersist";

const mockDb = {} as never;

describe("resolveAndPersist", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves a board+list when the name matches exactly one board", async () => {
    (
      boardRepo.getAssignableContextByUserId as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce([
      {
        boardPublicId: "brd1",
        boardName: "TT Firması",
        firstListPublicId: "lst1",
        members: [{ memberPublicId: "mem1", name: "Ahmet Yılmaz" }],
      },
    ]);
    (segmentTranscript as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        title: "Çekim organizasyonu",
        description: null,
        dueDateISO: "2026-07-07",
        boardNameGuess: "TT Firması",
        assigneeNameGuess: "Ahmet",
      },
    ]);
    (
      telegramLinkRepo.createPendingBatch as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({ publicId: "batch1" });

    const result = await resolveAndPersist(mockDb, {
      userId: "user-1",
      transcript: "TT firmasına çekim, hemen",
      anthropicApiKey: "sk-ant-test",
    });

    expect(result?.batchPublicId).toBe("batch1");
    expect(result?.resolved).toEqual([
      {
        title: "Çekim organizasyonu",
        description: null,
        dueDateISO: "2026-07-07",
        boardPublicId: "brd1",
        listPublicId: "lst1",
        boardName: "TT Firması",
        assigneePublicId: "mem1",
        assigneeName: "Ahmet Yılmaz",
      },
    ]);
  });

  it("leaves board/assignee null when the name is ambiguous or unmatched", async () => {
    (
      boardRepo.getAssignableContextByUserId as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce([]);
    (segmentTranscript as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        title: "Bir görev",
        description: null,
        dueDateISO: null,
        boardNameGuess: "Bilinmeyen Firma",
        assigneeNameGuess: null,
      },
    ]);
    (
      telegramLinkRepo.createPendingBatch as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({ publicId: "batch2" });

    const result = await resolveAndPersist(mockDb, {
      userId: "user-1",
      transcript: "bir görev",
      anthropicApiKey: "sk-ant-test",
    });

    expect(result?.resolved[0]).toEqual({
      title: "Bir görev",
      description: null,
      dueDateISO: null,
      boardPublicId: null,
      listPublicId: null,
      boardName: null,
      assigneePublicId: null,
      assigneeName: null,
    });
  });

  it("returns null when segmentation produces no tasks", async () => {
    (
      boardRepo.getAssignableContextByUserId as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce([]);
    (segmentTranscript as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const result = await resolveAndPersist(mockDb, {
      userId: "user-1",
      transcript: "anlaşılmaz mırıltı",
      anthropicApiKey: "sk-ant-test",
    });

    expect(result).toBeNull();
    expect(telegramLinkRepo.createPendingBatch).not.toHaveBeenCalled();
  });
});

describe("formatSummary", () => {
  it("numbers tasks, shows resolved board+assignee names, marks unresolved as Inbox", () => {
    const summary = formatSummary([
      {
        title: "Çekim organizasyonu",
        description: null,
        dueDateISO: "2026-07-07",
        boardPublicId: "brd1",
        listPublicId: "lst1",
        boardName: "TT Firması",
        assigneePublicId: "mem1",
        assigneeName: "Ahmet Yılmaz",
      },
      {
        title: "Bir görev",
        description: null,
        dueDateISO: null,
        boardPublicId: null,
        listPublicId: null,
        boardName: null,
        assigneePublicId: null,
        assigneeName: null,
      },
    ], "tr");
    expect(summary).toContain("1.");
    expect(summary).toContain("TT Firması");
    expect(summary).toContain("Ahmet Yılmaz");
    expect(summary).toContain("2.");
    expect(summary).toContain("Gelen Kutusu");
  });

  it("formats an English summary when locale is 'en'", () => {
    const resolved = [
      {
        title: "Design review",
        description: null,
        dueDateISO: null,
        boardPublicId: "board1",
        listPublicId: "list1",
        boardName: "Marketing",
        assigneePublicId: null,
        assigneeName: null,
      },
    ];
    expect(formatSummary(resolved, "en")).toBe("1. [Marketing board] Design review");
  });
});

import { describe, expect, it } from "vitest";
import {
  createBackupFilename,
  createLearningBackup,
  mergeLearningStores,
  parseLearningBackup,
} from "./learningBackup";
import type { LearningStore, LearningVideo } from "./learningStore";

function video(
  youtubeId: string,
  title: string,
  updatedAt: string,
): LearningVideo {
  return {
    youtubeId,
    title,
    normalizedUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
    status: "not-started",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt,
  };
}

function store(videos: LearningVideo[], lastOpenedVideoId: string | null = null): LearningStore {
  return { schemaVersion: 1, videos, lastOpenedVideoId };
}

describe("learningBackup", () => {
  it("exports validated, readable JSON", () => {
    const source = store([video("AAAAAAAAAAA", "백업 영상", "2026-08-01T00:00:00.000Z")]);
    const result = createLearningBackup(source);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(parseLearningBackup(result.json)).toEqual({ ok: true, store: source });
      expect(result.json).toContain("\n  \"schemaVersion\": 1");
    }
  });

  it.each([
    ["not json", "invalid-json"],
    [JSON.stringify({ schemaVersion: 2, videos: [], lastOpenedVideoId: null }), "invalid-data"],
    [JSON.stringify({ schemaVersion: 1, videos: [], lastOpenedVideoId: "AAAAAAAAAAA" }), "invalid-data"],
  ] as const)("rejects an invalid backup", (input, reason) => {
    expect(parseLearningBackup(input)).toEqual({ ok: false, reason });
  });

  it("merges by YouTube ID and keeps the most recently updated version", () => {
    const current = store([
      video("AAAAAAAAAAA", "현재의 오래된 제목", "2026-08-01T00:00:00.000Z"),
      video("BBBBBBBBBBB", "현재 영상", "2026-08-02T00:00:00.000Z"),
    ], "BBBBBBBBBBB");
    const incoming = store([
      video("AAAAAAAAAAA", "백업의 최신 제목", "2026-08-03T00:00:00.000Z"),
      video("CCCCCCCCCCC", "백업 영상", "2026-08-01T00:00:00.000Z"),
    ], "CCCCCCCCCCC");

    expect(mergeLearningStores(current, incoming)).toEqual({
      schemaVersion: 1,
      videos: [
        video("AAAAAAAAAAA", "백업의 최신 제목", "2026-08-03T00:00:00.000Z"),
        video("BBBBBBBBBBB", "현재 영상", "2026-08-02T00:00:00.000Z"),
        video("CCCCCCCCCCC", "백업 영상", "2026-08-01T00:00:00.000Z"),
      ],
      lastOpenedVideoId: "BBBBBBBBBBB",
    });
  });

  it("uses the required local-date backup filename", () => {
    expect(createBackupFilename(new Date(2026, 7, 29))).toBe(
      "vibe-learning-backup-2026-08-29.json",
    );
  });
});

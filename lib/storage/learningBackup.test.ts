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
    playbackMode: "embedded",
    playbackSeconds: 0,
    notes: [],
    segments: [],
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

  it("exports, imports, and merges notes with the newest video", () => {
    const older = video("AAAAAAAAAAA", "이전 영상", "2026-08-01T00:00:00.000Z");
    const newer = video("AAAAAAAAAAA", "최신 영상", "2026-08-03T00:00:00.000Z");
    newer.playbackMode = "external";
    newer.playbackSeconds = 42;
    newer.notes = [{
      id: "00000000-0000-4000-8000-000000000001",
      timestampSeconds: 42,
      text: "백업 메모",
      createdAt: "2026-08-03T00:00:00.000Z",
      updatedAt: "2026-08-03T00:00:00.000Z",
    }];

    const backup = createLearningBackup(store([newer]));
    expect(backup.ok).toBe(true);
    if (!backup.ok) return;
    expect(parseLearningBackup(backup.json)).toEqual({
      ok: true,
      store: store([newer]),
    });
    expect(mergeLearningStores(store([older]), store([newer])).videos[0])
      .toEqual(newer);
  });

  it("imports a legacy v1 backup with note defaults", () => {
    const legacyVideo = video(
      "AAAAAAAAAAA",
      "구형 백업 영상",
      "2026-08-01T00:00:00.000Z",
    );
    const legacyFields = {
      youtubeId: legacyVideo.youtubeId,
      title: legacyVideo.title,
      normalizedUrl: legacyVideo.normalizedUrl,
      status: legacyVideo.status,
      createdAt: legacyVideo.createdAt,
      updatedAt: legacyVideo.updatedAt,
    };

    expect(parseLearningBackup(JSON.stringify({
      schemaVersion: 1,
      videos: [legacyFields],
      lastOpenedVideoId: null,
    })))
      .toEqual({
        ok: true,
        store: store([legacyVideo]),
      });
  });

  it("exports and restores stored learning segments", () => {
    const sourceVideo = video("AAAAAAAAAAA", "구간 백업", "2026-08-03T00:00:00.000Z");
    sourceVideo.segments = [{ id: "00000000-0000-4000-8000-000000000003", title: "핵심", startSeconds: 5, endSeconds: 20, createdAt: "2026-08-03T00:00:00.000Z", updatedAt: "2026-08-03T00:00:00.000Z" }];
    const backup = createLearningBackup(store([sourceVideo]));
    expect(backup.ok).toBe(true);
    if (backup.ok) expect(parseLearningBackup(backup.json)).toEqual({ ok: true, store: store([sourceVideo]) });
  });
});

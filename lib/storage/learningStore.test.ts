import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createEmptyLearningStore,
  learningStoreKey,
  loadLearningStore,
  saveLearningStore,
  updateCurrentVideo,
  type LearningStore,
} from "./learningStore";

const videoId = "ABCDEFGHIJK";

function populatedStore(): LearningStore {
  return {
    schemaVersion: 1,
    videos: [
      {
        youtubeId: videoId,
        title: "테스트 영상",
        normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
        status: "not-started",
        playbackMode: "embedded",
        playbackSeconds: 0,
        notes: [],
        segments: [],
        createdAt: "2026-08-29T10:00:00.000Z",
        updatedAt: "2026-08-29T10:00:00.000Z",
      },
    ],
    lastOpenedVideoId: videoId,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("learningStore", () => {
  it("returns a new empty v1 store when no data exists", () => {
    expect(loadLearningStore()).toEqual(createEmptyLearningStore());
    expect(loadLearningStore()).not.toBe(loadLearningStore());
  });

  it("saves and loads the complete store through the versioned key", () => {
    const store = populatedStore();

    expect(saveLearningStore(store)).toEqual({ ok: true });
    expect(window.localStorage.getItem(learningStoreKey)).toBe(
      JSON.stringify(store),
    );
    expect(loadLearningStore()).toEqual(store);
  });

  it("rejects invalid data before writing to browser storage", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const invalidStore = {
      ...populatedStore(),
      videos: [
        {
          ...populatedStore().videos[0],
          normalizedUrl: "https://www.youtube.com/watch?v=ZZZZZZZZZZZ",
        },
      ],
    } as LearningStore;

    expect(saveLearningStore(invalidStore)).toEqual({
      ok: false,
      reason: "invalid-data",
    });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("applies defaults when loading legacy v1 video data", () => {
    const legacyStore = populatedStore();
    const legacyVideo = { ...legacyStore.videos[0] } as Partial<LearningStore["videos"][number]>;
    delete legacyVideo.playbackSeconds;
    delete legacyVideo.notes;
    delete legacyVideo.segments;
    window.localStorage.setItem(
      learningStoreKey,
      JSON.stringify({ ...legacyStore, videos: [legacyVideo] }),
    );

    expect(loadLearningStore().videos[0]).toMatchObject({
      playbackMode: "embedded",
      playbackSeconds: 0,
      notes: [],
      segments: [],
    });
  });

  it("persists learning segments and rejects invalid ranges", () => {
    const store = populatedStore();
    store.videos[0].segments = [segment(10, 25)];
    expect(saveLearningStore(store)).toEqual({ ok: true });
    expect(loadLearningStore().videos[0].segments).toEqual([segment(10, 25)]);

    store.videos[0].segments = [segment(25, 10)];
    expect(saveLearningStore(store)).toEqual({ ok: false, reason: "invalid-data" });
  });

  it("updates only the selected video without mutating the source", () => {
    const source = populatedStore();
    const updated = updateCurrentVideo(
      source,
      videoId,
      "2026-08-30T00:00:00.000Z",
      (video) => ({ ...video, status: "in-progress" }),
    );

    expect(updated.videos[0]).toMatchObject({
      status: "in-progress",
      updatedAt: "2026-08-30T00:00:00.000Z",
    });
    expect(updated.lastOpenedVideoId).toBe(videoId);
    expect(source.videos[0].status).toBe("not-started");
  });

  it.each([
    { text: " ", reason: "blank note" },
    { text: "a".repeat(2_001), reason: "long note" },
  ])("rejects a $reason", ({ text }) => {
    const store = populatedStore();
    store.videos[0].notes = [note("00000000-0000-4000-8000-000000000001", text)];
    expect(saveLearningStore(store)).toEqual({ ok: false, reason: "invalid-data" });
  });

  it("rejects more than 500 notes and duplicate note IDs", () => {
    const tooMany = populatedStore();
    tooMany.videos[0].notes = Array.from({ length: 501 }, (_, index) =>
      note(`00000000-0000-4000-8000-${String(index).padStart(12, "0")}`, "메모"),
    );
    expect(saveLearningStore(tooMany)).toEqual({ ok: false, reason: "invalid-data" });

    const duplicates = populatedStore();
    duplicates.videos[0].notes = [
      note("00000000-0000-4000-8000-000000000001", "첫 메모"),
      note("00000000-0000-4000-8000-000000000001", "둘째 메모"),
    ];
    expect(saveLearningStore(duplicates)).toEqual({ ok: false, reason: "invalid-data" });
  });

  it.each([
    "not json",
    JSON.stringify({ schemaVersion: 2, videos: [], lastOpenedVideoId: null }),
    JSON.stringify({ schemaVersion: 1, videos: "invalid", lastOpenedVideoId: null }),
    JSON.stringify({
      ...populatedStore(),
      videos: [
        {
          ...populatedStore().videos[0],
          normalizedUrl: "https://www.youtube.com/watch?v=ZZZZZZZZZZZ",
        },
      ],
    }),
  ])("recovers from corrupted stored data", (storedValue) => {
    window.localStorage.setItem(learningStoreKey, storedValue);

    expect(loadLearningStore()).toEqual(createEmptyLearningStore());
  });

  it("does not access window during server rendering", () => {
    vi.stubGlobal("window", undefined);

    expect(loadLearningStore()).toEqual(createEmptyLearningStore());
    expect(saveLearningStore(populatedStore())).toEqual({
      ok: false,
      reason: "storage-unavailable",
    });
  });

  it("reports storage capacity errors without throwing", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage is full", "QuotaExceededError");
    });

    expect(saveLearningStore(populatedStore())).toEqual({
      ok: false,
      reason: "quota-exceeded",
    });
  });

  it("handles unavailable browser storage without throwing", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Access denied", "SecurityError");
    });

    expect(loadLearningStore()).toEqual(createEmptyLearningStore());

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Access denied", "SecurityError");
    });

    expect(saveLearningStore(populatedStore())).toEqual({
      ok: false,
      reason: "storage-unavailable",
    });
  });
});

function note(id: string, text: string) {
  return {
    id,
    timestampSeconds: 0,
    text,
    createdAt: "2026-08-29T10:00:00.000Z",
    updatedAt: "2026-08-29T10:00:00.000Z",
  };
}

function segment(startSeconds: number, endSeconds: number) {
  return {
    id: "00000000-0000-4000-8000-000000000002",
    title: "개인 구간",
    startSeconds,
    endSeconds,
    createdAt: "2026-08-29T10:00:00.000Z",
    updatedAt: "2026-08-29T10:00:00.000Z",
  };
}

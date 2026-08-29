import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createEmptyLearningStore,
  learningStoreKey,
  loadLearningStore,
  saveLearningStore,
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

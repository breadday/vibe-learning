import { afterEach, describe, expect, it, vi } from "vitest";
import * as idb from "./idb";
import {
  readLearningRecord,
  removeLearningRecord,
  writeLearningRecord,
} from "./idb";
import {
  createLearningId,
  createEmptyLearningStore,
  learningStoreKey,
  learningStoreWarningEvent,
  loadLearningStore,
  measureLearningStorageUsage,
  saveLearningStore,
  updateCurrentVideo,
  type LearningStore,
  type LearningStorageUsage,
} from "./learningStore";

const videoId = "ABCDEFGHIJK";

describe("createLearningId", () => {
  it("creates a valid UUID when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => bytes.fill(0x12),
    });

    try {
      expect(createLearningId()).toBe("12121212-1212-4212-9212-121212121212");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

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

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  await removeLearningRecord();
});

describe("learningStore", () => {
  it("returns a new empty v1 store when no data exists", async () => {
    const first = await loadLearningStore();
    const second = await loadLearningStore();
    expect(first).toEqual(createEmptyLearningStore());
    expect(first).not.toBe(second);
  });

  it("saves and loads the complete store through the versioned key", async () => {
    const store = populatedStore();

    expect(await saveLearningStore(store)).toEqual({ ok: true });
    expect(await readLearningRecord()).toBe(JSON.stringify(store));
    expect(window.localStorage.getItem(learningStoreKey)).toBeNull();
    expect(await loadLearningStore()).toEqual(store);
  });

  it("rejects invalid data before writing to browser storage", async () => {
    const writeRecord = vi.spyOn(idb, "writeLearningRecord");
    const invalidStore = {
      ...populatedStore(),
      videos: [
        {
          ...populatedStore().videos[0],
          normalizedUrl: "https://www.youtube.com/watch?v=ZZZZZZZZZZZ",
        },
      ],
    } as LearningStore;

    expect(await saveLearningStore(invalidStore)).toEqual({
      ok: false,
      reason: "invalid-data",
    });
    expect(writeRecord).not.toHaveBeenCalled();
  });

  it("migrates legacy localStorage data with defaults and removes it", async () => {
    const legacyStore = populatedStore();
    const legacyVideo = { ...legacyStore.videos[0] } as Partial<LearningStore["videos"][number]>;
    delete legacyVideo.playbackSeconds;
    delete legacyVideo.notes;
    delete legacyVideo.segments;
    window.localStorage.setItem(
      learningStoreKey,
      JSON.stringify({ ...legacyStore, videos: [legacyVideo] }),
    );

    expect((await loadLearningStore()).videos[0]).toMatchObject({
      playbackMode: "embedded",
      playbackSeconds: 0,
      notes: [],
      segments: [],
    });
    expect(window.localStorage.getItem(learningStoreKey)).toBeNull();
    expect(await readLearningRecord()).not.toBeNull();
  });

  it("keeps legacy localStorage data when IndexedDB migration fails", async () => {
    const legacyStore = populatedStore();
    const serialized = JSON.stringify(legacyStore);
    window.localStorage.setItem(learningStoreKey, serialized);
    vi.spyOn(idb, "writeLearningRecord").mockRejectedValueOnce(
      new DOMException("Access denied", "SecurityError"),
    );

    expect(await loadLearningStore()).toEqual(legacyStore);
    expect(window.localStorage.getItem(learningStoreKey)).toBe(serialized);
    expect(await readLearningRecord()).toBeNull();
  });

  it("persists learning segments and rejects invalid ranges", async () => {
    const store = populatedStore();
    store.videos[0].segments = [segment(10, 25)];
    expect(await saveLearningStore(store)).toEqual({ ok: true });
    expect((await loadLearningStore()).videos[0].segments).toEqual([segment(10, 25)]);

    store.videos[0].segments = [segment(25, 10)];
    expect(await saveLearningStore(store)).toEqual({ ok: false, reason: "invalid-data" });
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
  ])("rejects a $reason", async ({ text }) => {
    const store = populatedStore();
    store.videos[0].notes = [note("00000000-0000-4000-8000-000000000001", text)];
    expect(await saveLearningStore(store)).toEqual({ ok: false, reason: "invalid-data" });
  });

  it("rejects more than 500 notes and duplicate note IDs", async () => {
    const tooMany = populatedStore();
    tooMany.videos[0].notes = Array.from({ length: 501 }, (_, index) =>
      note(`00000000-0000-4000-8000-${String(index).padStart(12, "0")}`, "메모"),
    );
    expect(await saveLearningStore(tooMany)).toEqual({ ok: false, reason: "invalid-data" });

    const duplicates = populatedStore();
    duplicates.videos[0].notes = [
      note("00000000-0000-4000-8000-000000000001", "첫 메모"),
      note("00000000-0000-4000-8000-000000000001", "둘째 메모"),
    ];
    expect(await saveLearningStore(duplicates)).toEqual({ ok: false, reason: "invalid-data" });
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
  ])("recovers from corrupted stored data", async (storedValue) => {
    await writeLearningRecord(storedValue);

    expect(await loadLearningStore()).toEqual(createEmptyLearningStore());
  });

  it("does not access window during server rendering", async () => {
    vi.stubGlobal("window", undefined);

    expect(await loadLearningStore()).toEqual(createEmptyLearningStore());
    expect(await saveLearningStore(populatedStore())).toEqual({
      ok: false,
      reason: "storage-unavailable",
    });
  });

  it("reports storage capacity errors without throwing", async () => {
    vi.spyOn(idb, "writeLearningRecord").mockRejectedValueOnce(
      new DOMException("Storage is full", "QuotaExceededError"),
    );

    expect(await saveLearningStore(populatedStore())).toEqual({
      ok: false,
      reason: "quota-exceeded",
    });
  });

  it("handles unavailable browser storage without throwing", async () => {
    vi.spyOn(idb, "readLearningRecord").mockRejectedValueOnce(
      new DOMException("Access denied", "SecurityError"),
    );

    expect(await loadLearningStore()).toEqual(createEmptyLearningStore());

    vi.spyOn(idb, "writeLearningRecord").mockRejectedValueOnce(
      new DOMException("Access denied", "SecurityError"),
    );

    expect(await saveLearningStore(populatedStore())).toEqual({
      ok: false,
      reason: "storage-unavailable",
    });
  });
});

describe("learningStorageUsage", () => {
  it("measures browser storage usage below the warning threshold", async () => {
    stubStorageEstimate(0, 1_000_000);

    expect(await measureLearningStorageUsage()).toEqual({
      bytes: 0,
      quotaBytes: 1_000_000,
      usedRatio: 0,
      overThreshold: false,
    });

    expect(await saveLearningStore(populatedStore())).toEqual({ ok: true });
    expect((await measureLearningStorageUsage())?.overThreshold).toBe(false);
  });

  it("flags browser storage once it crosses the warning threshold", async () => {
    stubStorageEstimate(900_000, 1_000_000);

    const usage = await measureLearningStorageUsage();
    expect(usage?.bytes).toBe(900_000);
    expect(usage?.overThreshold).toBe(true);
  });

  it("warns through an event and the console when a save exceeds the threshold", async () => {
    stubStorageEstimate(900_000, 1_000_000);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const warnings: LearningStorageUsage[] = [];
    const handleWarning = (event: Event) => {
      warnings.push((event as CustomEvent<LearningStorageUsage>).detail);
    };
    window.addEventListener(learningStoreWarningEvent, handleWarning);

    try {
      expect(await saveLearningStore(populatedStore())).toEqual({ ok: true });

      expect(warnings).toHaveLength(1);
      expect(warnings[0]?.overThreshold).toBe(true);
      expect(warnings[0]?.bytes).toBe(900_000);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(learningStoreWarningEvent, handleWarning);
    }
  });
});

function stubStorageEstimate(usage: number, quota: number) {
  vi.stubGlobal("navigator", {
    ...window.navigator,
    storage: {
      estimate: vi.fn().mockResolvedValue({ usage, quota }),
    },
  });
}

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

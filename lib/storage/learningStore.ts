import { z } from "zod";
import {
  readLearningRecord,
  writeLearningRecord,
} from "./idb";

export const learningStoreKey = "vibe-learning:v1";
export const learningStoreChangedEvent = "vibe-learning:store-changed";
export const learningStoreWarningEvent = "vibe-learning:store-warning";
export const learningStorageWarningRatio = 0.8;

const learningNoteSchema = z
  .object({
    id: z.uuid(),
    timestampSeconds: z.number().int().min(0),
    text: z.string().trim().min(1).max(2_000),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

const learningSegmentSchema = z
  .object({
    id: z.uuid(),
    title: z.string().trim().min(1),
    startSeconds: z.number().int().min(0),
    endSeconds: z.number().int().min(1),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict()
  .refine((segment) => segment.endSeconds > segment.startSeconds, {
    path: ["endSeconds"],
    message: "종료 시간은 시작 시간보다 커야 합니다.",
  });

const learningVideoSchema = z
  .object({
    youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
    title: z.string().trim().min(1),
    normalizedUrl: z.url({ protocol: /^https$/ }),
    status: z.enum(["not-started", "in-progress", "completed"]),
    playbackMode: z.enum(["embedded", "external"]).default("embedded"),
    playbackSeconds: z.number().int().min(0).default(0),
    notes: z.array(learningNoteSchema).max(500).default([]),
    segments: z.array(learningSegmentSchema).default([]),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict()
  .superRefine((video, context) => {
    const expectedUrl = `https://www.youtube.com/watch?v=${video.youtubeId}`;

    if (video.normalizedUrl !== expectedUrl) {
      context.addIssue({
        code: "custom",
        path: ["normalizedUrl"],
        message: "정규화된 URL과 YouTube 영상 ID가 일치해야 합니다.",
      });
    }

    const noteIds = new Set<string>();
    video.notes.forEach((note, index) => {
      if (noteIds.has(note.id)) {
        context.addIssue({
          code: "custom",
          path: ["notes", index, "id"],
          message: "같은 메모 ID는 한 영상에서 한 번만 사용할 수 있습니다.",
        });
      }
      noteIds.add(note.id);
    });

    const segmentIds = new Set<string>();
    video.segments.forEach((segment, index) => {
      if (segmentIds.has(segment.id)) {
        context.addIssue({
          code: "custom",
          path: ["segments", index, "id"],
          message: "같은 구간 ID는 한 영상에서 한 번만 사용할 수 있습니다.",
        });
      }
      segmentIds.add(segment.id);
    });
  });

const learningStoreSchema = z
  .object({
    schemaVersion: z.literal(1),
    videos: z.array(learningVideoSchema),
    lastOpenedVideoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/).nullable(),
  })
  .strict()
  .superRefine((store, context) => {
    const videoIds = new Set<string>();

    store.videos.forEach((video, index) => {
      if (videoIds.has(video.youtubeId)) {
        context.addIssue({
          code: "custom",
          path: ["videos", index, "youtubeId"],
          message: "같은 YouTube 영상은 한 번만 저장할 수 있습니다.",
        });
      }
      videoIds.add(video.youtubeId);
    });

    if (
      store.lastOpenedVideoId !== null &&
      !videoIds.has(store.lastOpenedVideoId)
    ) {
      context.addIssue({
        code: "custom",
        path: ["lastOpenedVideoId"],
        message: "마지막으로 연 영상이 학습 목록에 있어야 합니다.",
      });
    }
  });

export type LearningVideo = z.infer<typeof learningVideoSchema>;
export type LearningNote = z.infer<typeof learningNoteSchema>;
export type LearningSegment = z.infer<typeof learningSegmentSchema>;
export type LearningStore = z.infer<typeof learningStoreSchema>;
export type SaveLearningStoreResult =
  | { ok: true }
  | {
    ok: false;
    reason: "invalid-data" | "quota-exceeded" | "storage-unavailable";
  };

export type LearningStorageUsage = {
  bytes: number;
  quotaBytes: number;
  usedRatio: number;
  overThreshold: boolean;
};

export function createLearningId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues(bytes);

  if (!globalThis.crypto?.getRandomValues) {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export function createEmptyLearningStore(): LearningStore {
  return {
    schemaVersion: 1,
    videos: [],
    lastOpenedVideoId: null,
  };
}

export function parseLearningStoreData(value: unknown): LearningStore | null {
  const result = learningStoreSchema.safeParse(value);
  return result.success ? result.data : null;
}

let operationChain: Promise<unknown> = Promise.resolve();

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationChain.then(operation, operation);
  operationChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function parseStoredValue(storedValue: string): LearningStore | null {
  try {
    return parseLearningStoreData(JSON.parse(storedValue));
  } catch {
    return null;
  }
}

async function loadStoredRecord(): Promise<LearningStore> {
  const storedValue = await readLearningRecord();

  if (storedValue !== null) {
    return parseStoredValue(storedValue) ?? createEmptyLearningStore();
  }

  return migrateLegacyStore();
}

async function migrateLegacyStore(): Promise<LearningStore> {
  let legacyValue: string | null;
  try {
    legacyValue = window.localStorage.getItem(learningStoreKey);
  } catch {
    return createEmptyLearningStore();
  }

  if (legacyValue === null) {
    return createEmptyLearningStore();
  }

  const migrated = parseStoredValue(legacyValue);

  if (migrated !== null) {
    try {
      await writeLearningRecord(JSON.stringify(migrated));
    } catch {
      return migrated;
    }
  }

  try {
    window.localStorage.removeItem(learningStoreKey);
  } catch {
    // 삭제에 실패해도 마이그레이션 결과는 유지합니다.
  }

  return migrated ?? createEmptyLearningStore();
}

export function loadLearningStore(): Promise<LearningStore> {
  if (typeof window === "undefined") {
    return Promise.resolve(createEmptyLearningStore());
  }

  return enqueue(async () => {
    try {
      return await loadStoredRecord();
    } catch {
      return createEmptyLearningStore();
    }
  });
}

export async function saveLearningStore(
  store: LearningStore,
): Promise<SaveLearningStoreResult> {
  const validatedStore = parseLearningStoreData(store);

  if (validatedStore === null) {
    return { ok: false, reason: "invalid-data" };
  }

  if (typeof window === "undefined") {
    return { ok: false, reason: "storage-unavailable" };
  }

  return enqueue(async () => {
    try {
      await writeLearningRecord(JSON.stringify(validatedStore));
      window.dispatchEvent(new Event(learningStoreChangedEvent));
      await checkLearningStorageUsage();
      return { ok: true };
    } catch (error) {
      if (isQuotaExceededError(error)) {
        return { ok: false, reason: "quota-exceeded" };
      }

      return { ok: false, reason: "storage-unavailable" };
    }
  });
}

export async function measureLearningStorageUsage(): Promise<LearningStorageUsage | null> {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const estimate = await navigator.storage?.estimate();

    if (!estimate || typeof estimate.quota !== "number" || estimate.quota <= 0) {
      return null;
    }

    const bytes = estimate.usage ?? 0;
    const usedRatio = bytes / estimate.quota;

    return {
      bytes,
      quotaBytes: estimate.quota,
      usedRatio,
      overThreshold: usedRatio >= learningStorageWarningRatio,
    };
  } catch {
    return null;
  }
}

export async function checkLearningStorageUsage(): Promise<LearningStorageUsage | null> {
  const usage = await measureLearningStorageUsage();

  if (usage === null || !usage.overThreshold) {
    return usage;
  }

  console.warn(
    `브라우저 저장소 사용량이 임계치를 넘었습니다: ${usage.bytes} / ${usage.quotaBytes} bytes`,
  );
  window.dispatchEvent(
    new CustomEvent<LearningStorageUsage>(learningStoreWarningEvent, {
      detail: usage,
    }),
  );
  return usage;
}

export function updateCurrentVideo(
  store: LearningStore,
  videoId: string,
  updatedAt: string,
  update: (video: LearningVideo) => LearningVideo,
): LearningStore {
  return {
    ...store,
    videos: store.videos.map((video) =>
      video.youtubeId === videoId
        ? { ...update(video), updatedAt }
        : video,
    ),
    lastOpenedVideoId: videoId,
  };
}

function isQuotaExceededError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 ||
      error.code === 1014)
  );
}

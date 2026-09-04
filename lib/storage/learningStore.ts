import { z } from "zod";

export const learningStoreKey = "vibe-learning:v1";
export const learningStoreChangedEvent = "vibe-learning:store-changed";
export const learningStoreWarningEvent = "vibe-learning:store-warning";
export const learningStorageQuotaBytes = 5 * 1024 * 1024;
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

export function loadLearningStore(): LearningStore {
  if (typeof window === "undefined") {
    return createEmptyLearningStore();
  }

  try {
    const storedValue = window.localStorage.getItem(learningStoreKey);

    if (storedValue === null) {
      return createEmptyLearningStore();
    }

    return parseLearningStoreData(JSON.parse(storedValue)) ?? createEmptyLearningStore();
  } catch {
    return createEmptyLearningStore();
  }
}

export function saveLearningStore(
  store: LearningStore,
): SaveLearningStoreResult {
  const validatedStore = parseLearningStoreData(store);

  if (validatedStore === null) {
    return { ok: false, reason: "invalid-data" };
  }

  if (typeof window === "undefined") {
    return { ok: false, reason: "storage-unavailable" };
  }

  try {
    window.localStorage.setItem(
      learningStoreKey,
      JSON.stringify(validatedStore),
    );
    window.dispatchEvent(new Event(learningStoreChangedEvent));
    checkLearningStorageUsage();
    return { ok: true };
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return { ok: false, reason: "quota-exceeded" };
    }

    return { ok: false, reason: "storage-unavailable" };
  }
}

export function measureLearningStorageUsage(): LearningStorageUsage | null {
  if (typeof window === "undefined") {
    return null;
  }

  let storedValue: string | null;
  try {
    storedValue = window.localStorage.getItem(learningStoreKey);
  } catch {
    return null;
  }

  const bytes = storedValue === null ? 0 : new Blob([storedValue]).size;
  const usedRatio = bytes / learningStorageQuotaBytes;
  return {
    bytes,
    quotaBytes: learningStorageQuotaBytes,
    usedRatio,
    overThreshold: usedRatio >= learningStorageWarningRatio,
  };
}

export function checkLearningStorageUsage(): LearningStorageUsage | null {
  const usage = measureLearningStorageUsage();

  if (usage === null || !usage.overThreshold) {
    return usage;
  }

  console.warn(
    `localStorage 사용량이 임계치를 넘었습니다: ${usage.bytes} / ${usage.quotaBytes} bytes`,
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

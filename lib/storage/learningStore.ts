import { z } from "zod";

export const learningStoreKey = "vibe-learning:v1";
export const learningStoreChangedEvent = "vibe-learning:store-changed";

const learningNoteSchema = z
  .object({
    id: z.uuid(),
    timestampSeconds: z.number().int().min(0),
    text: z.string().trim().min(1).max(2_000),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

const learningVideoSchema = z
  .object({
    youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
    title: z.string().trim().min(1),
    normalizedUrl: z.url({ protocol: /^https$/ }),
    status: z.enum(["not-started", "in-progress", "completed"]),
    playbackMode: z.enum(["embedded", "external"]).default("embedded"),
    playbackSeconds: z.number().int().min(0).default(0),
    notes: z.array(learningNoteSchema).max(500).default([]),
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
export type LearningStore = z.infer<typeof learningStoreSchema>;
export type SaveLearningStoreResult =
  | { ok: true }
  | {
    ok: false;
    reason: "invalid-data" | "quota-exceeded" | "storage-unavailable";
  };

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
    return { ok: true };
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return { ok: false, reason: "quota-exceeded" };
    }

    return { ok: false, reason: "storage-unavailable" };
  }
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

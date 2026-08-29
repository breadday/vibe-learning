import { z } from "zod";

export const learningStoreKey = "vibe-learning:v1";

const learningVideoSchema = z
  .object({
    youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
    title: z.string().trim().min(1),
    normalizedUrl: z.url({ protocol: /^https$/ }),
    status: z.enum(["not-started", "in-progress", "completed"]),
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
  });

const learningStoreSchema = z
  .object({
    schemaVersion: z.literal(1),
    videos: z.array(learningVideoSchema),
    lastOpenedVideoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/).nullable(),
  })
  .strict();

export type LearningVideo = z.infer<typeof learningVideoSchema>;
export type LearningStore = z.infer<typeof learningStoreSchema>;
export type SaveLearningStoreResult =
  | { ok: true }
  | { ok: false; reason: "quota-exceeded" | "storage-unavailable" };

export function createEmptyLearningStore(): LearningStore {
  return {
    schemaVersion: 1,
    videos: [],
    lastOpenedVideoId: null,
  };
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

    const result = learningStoreSchema.safeParse(JSON.parse(storedValue));
    return result.success ? result.data : createEmptyLearningStore();
  } catch {
    return createEmptyLearningStore();
  }
}

export function saveLearningStore(
  store: LearningStore,
): SaveLearningStoreResult {
  if (typeof window === "undefined") {
    return { ok: false, reason: "storage-unavailable" };
  }

  try {
    window.localStorage.setItem(learningStoreKey, JSON.stringify(store));
    return { ok: true };
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return { ok: false, reason: "quota-exceeded" };
    }

    return { ok: false, reason: "storage-unavailable" };
  }
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

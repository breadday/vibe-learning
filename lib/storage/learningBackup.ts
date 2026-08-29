import {
  parseLearningStoreData,
  type LearningStore,
  type LearningVideo,
} from "./learningStore";

export type ParseLearningBackupResult =
  | { ok: true; store: LearningStore }
  | { ok: false; reason: "invalid-json" | "invalid-data" };

export type CreateLearningBackupResult =
  | { ok: true; json: string }
  | { ok: false; reason: "invalid-data" };

export function createLearningBackup(
  store: LearningStore,
): CreateLearningBackupResult {
  const validatedStore = parseLearningStoreData(store);

  if (validatedStore === null) {
    return { ok: false, reason: "invalid-data" };
  }

  return { ok: true, json: JSON.stringify(validatedStore, null, 2) };
}

export function parseLearningBackup(input: string): ParseLearningBackupResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }

  const store = parseLearningStoreData(parsed);
  return store === null
    ? { ok: false, reason: "invalid-data" }
    : { ok: true, store };
}

export function mergeLearningStores(
  current: LearningStore,
  incoming: LearningStore,
): LearningStore {
  const videosById = new Map<string, LearningVideo>();

  [...current.videos, ...incoming.videos].forEach((video) => {
    const savedVideo = videosById.get(video.youtubeId);
    if (savedVideo === undefined || video.updatedAt > savedVideo.updatedAt) {
      videosById.set(video.youtubeId, video);
    }
  });

  const videos = [...videosById.values()];
  const availableIds = new Set(videos.map((video) => video.youtubeId));
  const lastOpenedVideoId =
    current.lastOpenedVideoId && availableIds.has(current.lastOpenedVideoId)
      ? current.lastOpenedVideoId
      : incoming.lastOpenedVideoId && availableIds.has(incoming.lastOpenedVideoId)
        ? incoming.lastOpenedVideoId
        : null;

  return { schemaVersion: 1, videos, lastOpenedVideoId };
}

export function createBackupFilename(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `vibe-learning-backup-${year}-${month}-${day}.json`;
}

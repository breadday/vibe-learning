import { createStore, del, get, set, type UseStore } from "idb-keyval";

export const idbDatabaseName = "vibe-learning";
export const idbStoreName = "learning";
export const learningRecordKey = "vibe-learning:v1";

let recordStore: UseStore | undefined;

function resolveRecordStore(): UseStore {
  if (recordStore === undefined) {
    recordStore = createStore(idbDatabaseName, idbStoreName);
  }
  return recordStore;
}

export async function readLearningRecord(): Promise<string | null> {
  const value = await get<string>(learningRecordKey, resolveRecordStore());
  return value ?? null;
}

export async function writeLearningRecord(value: string): Promise<void> {
  await set(learningRecordKey, value, resolveRecordStore());
}

export async function removeLearningRecord(): Promise<void> {
  await del(learningRecordKey, resolveRecordStore());
}

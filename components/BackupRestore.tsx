"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import {
  createBackupFilename,
  createLearningBackup,
  mergeLearningStores,
  parseLearningBackup,
} from "../lib/storage/learningBackup";
import {
  learningStoreChangedEvent,
  loadLearningStore,
  saveLearningStore,
  type LearningStore,
} from "../lib/storage/learningStore";
import { subscribeToLearningStoreUpdates } from "../lib/storage/sync";

export function BackupRestore() {
  const [currentStore, setCurrentStore] = useState<LearningStore | null>(null);
  const [previewStore, setPreviewStore] = useState<LearningStore | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refreshStore = () => {
      void loadLearningStore().then((loadedStore) => {
        if (!cancelled) {
          setCurrentStore(loadedStore);
        }
      });
    };

    refreshStore();
    window.addEventListener(learningStoreChangedEvent, refreshStore);
    const unsubscribe = subscribeToLearningStoreUpdates(refreshStore);
    return () => {
      cancelled = true;
      window.removeEventListener(learningStoreChangedEvent, refreshStore);
      unsubscribe();
    };
  }, []);

  async function handleExport() {
    const result = createLearningBackup(await loadLearningStore());

    if (!result.ok) {
      setError("현재 학습 데이터를 검증하지 못해 백업할 수 없습니다.");
      return;
    }

    const objectUrl = URL.createObjectURL(
      new Blob([result.json], { type: "application/json" }),
    );
    const downloadLink = document.createElement("a");
    downloadLink.href = objectUrl;
    downloadLink.download = createBackupFilename();
    downloadLink.click();
    URL.revokeObjectURL(objectUrl);
    setError(null);
    setMessage("검증된 JSON 백업을 만들었습니다.");
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const result = parseLearningBackup(await file.text());
      if (!result.ok) {
        setPreviewStore(null);
        setMessage(null);
        setError(
          result.reason === "invalid-json"
            ? "JSON 파일을 읽을 수 없습니다."
            : "v1 학습 백업 형식과 일치하지 않습니다.",
        );
        return;
      }

      setPreviewStore(result.store);
      setMessage(null);
      setError(null);
    } catch {
      setPreviewStore(null);
      setMessage(null);
      setError("백업 파일을 읽지 못했습니다.");
    }
  }

  async function handleRestore(mode: "overwrite" | "merge") {
    if (previewStore === null) {
      return;
    }

    const stored = await loadLearningStore();
    const nextStore =
      mode === "merge"
        ? mergeLearningStores(stored, previewStore)
        : previewStore;
    const result = await saveLearningStore(nextStore);

    if (!result.ok) {
      setError("복원한 학습 데이터를 브라우저에 저장하지 못했습니다.");
      return;
    }

    setPreviewStore(null);
    setError(null);
    setMessage(
      mode === "merge"
        ? "백업을 현재 학습 목록과 병합했습니다."
        : "현재 학습 목록을 백업 데이터로 교체했습니다.",
    );
  }

  const currentIds = new Set(
    currentStore?.videos.map((video) => video.youtubeId) ?? [],
  );
  const duplicateCount = previewStore?.videos.filter((video) =>
    currentIds.has(video.youtubeId),
  ).length ?? 0;
  const noteCount = previewStore?.videos.reduce(
    (total, video) => total + video.notes.length,
    0,
  ) ?? 0;

  return (
    <section className="backup-restore" aria-labelledby="backup-heading">
      <div>
        <p className="context-label">JSON 백업·복원</p>
        <h2 id="backup-heading">내 학습 목록을 직접 보관하세요</h2>
        <p>내보내기와 가져오기는 이 브라우저 안에서만 처리됩니다.</p>
      </div>
      <div className="backup-actions">
        <button type="button" onClick={handleExport}>JSON 내보내기</button>
        <label className="import-button" htmlFor="backup-file">JSON 가져오기</label>
        <input
          className="sr-only"
          id="backup-file"
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
        />
      </div>

      {previewStore ? (
        <div className="backup-preview" role="status">
          <strong>가져오기 미리보기</strong>
          <p>
            영상 {previewStore.videos.length}개 · 메모 {noteCount}개 · 현재 목록과 중복 {duplicateCount}개
          </p>
          <div>
            <button type="button" onClick={() => handleRestore("merge")}>병합</button>
            <button type="button" onClick={() => handleRestore("overwrite")}>덮어쓰기</button>
          </div>
        </div>
      ) : null}

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p className="backup-message" role="status">{message}</p> : null}
    </section>
  );
}

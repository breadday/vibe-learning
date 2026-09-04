"use client";

import { useEffect, useState } from "react";
import {
  learningStoreChangedEvent,
  loadLearningStore,
  saveLearningStore,
  type LearningStore,
  type LearningVideo,
} from "../lib/storage/learningStore";
import { subscribeToLearningStoreUpdates } from "../lib/storage/sync";
import { LearningVideoCard } from "./LearningVideoCard";

export function LearningLibrary() {
  const [store, setStore] = useState<LearningStore | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refreshStore = () => {
      void loadLearningStore().then((loadedStore) => {
        if (!cancelled) {
          setStore(loadedStore);
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

  if (store === null) {
    return <section className="learning-library" aria-label="학습 목록" />;
  }

  const currentStore = store;
  const byUpdatedAt = [...currentStore.videos].sort(compareUpdatedAt);
  const recentVideos = [...currentStore.videos].sort(compareCreatedAt).slice(0, 3);
  const unfinishedVideos = byUpdatedAt.filter((video) => video.status !== "completed");
  const continueVideo =
    unfinishedVideos.find((video) => video.youtubeId === currentStore.lastOpenedVideoId) ??
    unfinishedVideos[0] ??
    null;

  async function handleOpen(videoId: string) {
    if (currentStore.lastOpenedVideoId === videoId) {
      return;
    }

    await saveLearningStore({ ...currentStore, lastOpenedVideoId: videoId });
  }

  async function handleDelete(video: LearningVideo) {
    if (!window.confirm(`“${video.title}” 영상을 학습 목록에서 삭제할까요?`)) {
      return;
    }

    const saveResult = await saveLearningStore({
      ...currentStore,
      videos: currentStore.videos.filter((item) => item.youtubeId !== video.youtubeId),
      lastOpenedVideoId:
        currentStore.lastOpenedVideoId === video.youtubeId
          ? null
          : currentStore.lastOpenedVideoId,
    });

    if (!saveResult.ok) {
      setSaveError("학습 목록을 저장하지 못했습니다. 다시 시도해 주세요.");
      return;
    }

    setSaveError(null);
  }

  if (currentStore.videos.length === 0) {
    return (
      <section className="learning-library empty-library" aria-label="학습 목록">
        <h2>아직 등록한 영상이 없습니다.</h2>
        <p>위에 YouTube 주소를 붙여 넣어 첫 학습을 시작해 보세요.</p>
      </section>
    );
  }

  return (
    <section className="learning-library" aria-label="학습 목록">
      {saveError ? <p className="form-error" role="alert">{saveError}</p> : null}

      {continueVideo ? (
        <section className="library-section continue-section">
          <div className="library-heading">
            <p>이어서 학습</p>
            <h2>멈춘 곳에서 계속하세요</h2>
          </div>
          <LearningVideoCard video={continueVideo} onOpen={handleOpen} />
        </section>
      ) : null}

      <section className="library-section">
        <div className="library-heading">
          <p>최근 등록 영상</p>
          <h2>새로 모은 학습 자료</h2>
        </div>
        <div className="learning-card-grid">
          {recentVideos.map((video) => (
            <LearningVideoCard
              key={video.youtubeId}
              video={video}
              onOpen={handleOpen}
            />
          ))}
        </div>
      </section>

      <section className="library-section">
        <div className="library-heading">
          <p>전체 학습 목록</p>
          <h2>최근 수정한 순서로 보기</h2>
        </div>
        <div className="learning-card-grid">
          {byUpdatedAt.map((video) => (
            <LearningVideoCard
              key={video.youtubeId}
              video={video}
              onOpen={handleOpen}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </section>
    </section>
  );
}

function compareUpdatedAt(left: LearningVideo, right: LearningVideo) {
  return right.updatedAt.localeCompare(left.updatedAt);
}

function compareCreatedAt(left: LearningVideo, right: LearningVideo) {
  return right.createdAt.localeCompare(left.createdAt);
}

"use client";

import { useEffect, useReducer, useState, useSyncExternalStore } from "react";
import {
  learningStoreChangedEvent,
  loadLearningStore,
  saveLearningStore,
  type LearningVideo,
} from "../lib/storage/learningStore";
import { LearningVideoCard } from "./LearningVideoCard";

export function LearningLibrary() {
  const isClient = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const handleStoreChange = () => refresh();
    window.addEventListener(learningStoreChangedEvent, handleStoreChange);
    window.addEventListener("storage", handleStoreChange);
    return () => {
      window.removeEventListener(learningStoreChangedEvent, handleStoreChange);
      window.removeEventListener("storage", handleStoreChange);
    };
  }, []);

  if (!isClient) {
    return <section className="learning-library" aria-label="학습 목록" />;
  }

  const store = loadLearningStore();
  const byUpdatedAt = [...store.videos].sort(compareUpdatedAt);
  const recentVideos = [...store.videos].sort(compareCreatedAt).slice(0, 3);
  const unfinishedVideos = byUpdatedAt.filter((video) => video.status !== "completed");
  const continueVideo =
    unfinishedVideos.find((video) => video.youtubeId === store.lastOpenedVideoId) ??
    unfinishedVideos[0] ??
    null;

  function handleOpen(videoId: string) {
    if (store.lastOpenedVideoId === videoId) {
      return;
    }

    saveLearningStore({ ...store, lastOpenedVideoId: videoId });
  }

  function handleDelete(video: LearningVideo) {
    if (!window.confirm(`“${video.title}” 영상을 학습 목록에서 삭제할까요?`)) {
      return;
    }

    const saveResult = saveLearningStore({
      ...store,
      videos: store.videos.filter((item) => item.youtubeId !== video.youtubeId),
      lastOpenedVideoId:
        store.lastOpenedVideoId === video.youtubeId
          ? null
          : store.lastOpenedVideoId,
    });

    if (!saveResult.ok) {
      setSaveError("학습 목록을 저장하지 못했습니다. 다시 시도해 주세요.");
      return;
    }

    setSaveError(null);
    refresh();
  }

  if (store.videos.length === 0) {
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

function subscribe() {
  return () => undefined;
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

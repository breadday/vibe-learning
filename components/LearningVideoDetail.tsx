"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useReducer, useState, useSyncExternalStore } from "react";
import {
  loadLearningStore,
  saveLearningStore,
  type LearningVideo,
} from "../lib/storage/learningStore";

const statusLabels = {
  "not-started": "학습 전",
  "in-progress": "학습 중",
  completed: "완료",
} as const;

export function LearningVideoDetail() {
  const { id } = useParams<{ id: string }>();
  const isClient = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const video: LearningVideo | null | undefined = isClient
    ? loadLearningStore().videos.find((item) => item.youtubeId === id) ?? null
    : undefined;

  function handleStatusChange(status: LearningVideo["status"]) {
    const store = loadLearningStore();
    const saveResult = saveLearningStore({
      ...store,
      videos: store.videos.map((item) =>
        item.youtubeId === id
          ? { ...item, status, updatedAt: new Date().toISOString() }
          : item,
      ),
      lastOpenedVideoId: id,
    });

    if (!saveResult.ok) {
      setSaveError("학습 상태를 저장하지 못했습니다. 다시 시도해 주세요.");
      return;
    }

    setSaveError(null);
    refresh();
  }

  if (video === undefined) {
    return <main className="detail-state" role="status">학습 영상을 불러오는 중입니다.</main>;
  }

  if (video === null) {
    return (
      <main className="detail-state">
        <h1>저장된 영상을 찾을 수 없습니다.</h1>
        <Link href="/">YouTube 영상 등록으로 돌아가기</Link>
      </main>
    );
  }

  return (
    <main className="saved-video-page">
      <header className="saved-video-header">
        <Link className="brand" href="/"><span>V</span> Vibe Learning</Link>
        <Link href="/">다른 영상 추가</Link>
      </header>
      <article>
        <div className="detail-status-row">
          <label htmlFor="learning-status">학습 상태</label>
          <select
            id="learning-status"
            value={video.status}
            onChange={(event) =>
              handleStatusChange(event.target.value as LearningVideo["status"])
            }
          >
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        {saveError ? <p className="form-error" role="alert">{saveError}</p> : null}
        <h1>{video.title}</h1>
        <p className="saved-video-id">YouTube ID · {video.youtubeId}</p>
        <div className="saved-player">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <p className="detail-placeholder">
          핵심 3줄, 타임스탬프, 개인 메모는 다음 단계에서 이 화면에 연결됩니다.
        </p>
      </article>
    </main>
  );
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

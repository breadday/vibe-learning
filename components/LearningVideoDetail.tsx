"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  loadLearningStore,
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
  const video: LearningVideo | null | undefined = isClient
    ? loadLearningStore().videos.find((item) => item.youtubeId === id) ?? null
    : undefined;

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
        <p className="context-label">{statusLabels[video.status]}</p>
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

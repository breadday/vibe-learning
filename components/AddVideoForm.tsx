"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  loadLearningStore,
  saveLearningStore,
} from "../lib/storage/learningStore";
import { parseYouTubeUrl } from "../lib/youtube/parseYouTubeUrl";

const errorMessages = {
  "invalid-url": "올바른 https 주소를 입력해 주세요.",
  "unsupported-host": "지원하는 YouTube 주소만 등록할 수 있습니다.",
  "invalid-video-id": "영상 주소에서 유효한 영상 ID를 찾지 못했습니다.",
} as const;

export function AddVideoForm() {
  const router = useRouter();
  const [urlInput, setUrlInput] = useState("");
  const [title, setTitle] = useState("");
  const [duplicateVideoId, setDuplicateVideoId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const parseResult = urlInput.trim() ? parseYouTubeUrl(urlInput) : null;
  const canSubmit = parseResult?.ok === true && title.trim().length > 0;

  function handleUrlChange(value: string) {
    setUrlInput(value);
    setDuplicateVideoId(null);
    setSaveError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || !parseResult?.ok) {
      return;
    }

    const store = loadLearningStore();
    const duplicate = store.videos.find(
      (video) => video.youtubeId === parseResult.videoId,
    );

    if (duplicate) {
      setDuplicateVideoId(duplicate.youtubeId);
      setSaveError(null);
      return;
    }

    const now = new Date().toISOString();
    const saveResult = saveLearningStore({
      ...store,
      videos: [
        ...store.videos,
        {
          youtubeId: parseResult.videoId,
          title: title.trim(),
          normalizedUrl: parseResult.normalizedUrl,
          status: "not-started",
          createdAt: now,
          updatedAt: now,
        },
      ],
      lastOpenedVideoId: parseResult.videoId,
    });

    if (!saveResult.ok) {
      setSaveError(
        saveResult.reason === "quota-exceeded"
          ? "브라우저 저장 공간이 부족합니다. 불필요한 데이터를 정리해 주세요."
          : "브라우저에 저장할 수 없습니다. 저장소 사용 설정을 확인해 주세요.",
      );
      return;
    }

    router.push(`/videos/${parseResult.videoId}`);
  }

  return (
    <form className="add-video-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="youtube-url">YouTube 주소를 붙여 넣으세요</label>
        <input
          id="youtube-url"
          type="url"
          value={urlInput}
          onChange={(event) => handleUrlChange(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          aria-describedby={parseResult && !parseResult.ok ? "url-error" : undefined}
          aria-invalid={parseResult?.ok === false}
          autoComplete="url"
        />
        {parseResult && !parseResult.ok ? (
          <p id="url-error" className="form-error" role="alert">
            {errorMessages[parseResult.reason]}
          </p>
        ) : (
          <p className="form-help">일반 영상, 단축 URL, Shorts, embed 주소를 지원합니다.</p>
        )}
      </div>

      {parseResult?.ok ? (
        <div className="video-preview" aria-live="polite">
          <div
            className="video-thumbnail"
            role="img"
            aria-label={`YouTube 영상 ${parseResult.videoId} 썸네일`}
            style={{
              backgroundImage: `url("https://i.ytimg.com/vi/${parseResult.videoId}/hqdefault.jpg")`,
            }}
          />
          <div>
            <span>등록할 영상</span>
            <strong>{parseResult.videoId}</strong>
            <a href={parseResult.normalizedUrl} target="_blank" rel="noreferrer">
              YouTube에서 확인
            </a>
          </div>
        </div>
      ) : null}

      <div className="form-field">
        <label htmlFor="video-title">학습 제목</label>
        <input
          id="video-title"
          type="text"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setSaveError(null);
          }}
          placeholder="나중에 알아보기 쉬운 제목을 입력하세요"
          maxLength={120}
        />
      </div>

      {duplicateVideoId ? (
        <div className="form-notice" role="status">
          <p>이미 학습 목록에 등록된 영상입니다.</p>
          <button
            type="button"
            onClick={() => router.push(`/videos/${duplicateVideoId}`)}
          >
            기존 영상으로 이동
          </button>
        </div>
      ) : null}

      {saveError ? <p className="form-error" role="alert">{saveError}</p> : null}

      <button className="submit-video" type="submit" disabled={!canSubmit}>
        학습에 추가
      </button>
    </form>
  );
}

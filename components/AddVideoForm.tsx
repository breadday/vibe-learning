"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
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

type TitleLookupStatus = "idle" | "loading" | "success" | "error";
type TitleOrigin = "empty" | "automatic" | "user";

const titleLookupDelayMs = 300;

export function AddVideoForm() {
  const router = useRouter();
  const [urlInput, setUrlInput] = useState("");
  const [title, setTitle] = useState("");
  const [duplicateVideoId, setDuplicateVideoId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [titleLookupStatus, setTitleLookupStatus] =
    useState<TitleLookupStatus>("idle");
  const titleOriginRef = useRef<TitleOrigin>("empty");
  const requestSequenceRef = useRef(0);
  const automaticTitleCacheRef = useRef(new Map<string, string>());
  const inFlightVideoIdRef = useRef<string | null>(null);
  const parseResult = urlInput.trim() ? parseYouTubeUrl(urlInput) : null;
  const videoId = parseResult?.ok ? parseResult.videoId : null;
  const canSubmit = parseResult?.ok === true && title.trim().length > 0;

  useEffect(() => {
    const requestSequence = ++requestSequenceRef.current;
    const controller = new AbortController();

    if (!videoId) {
      return () => controller.abort();
    }

    const cachedTitle = automaticTitleCacheRef.current.get(videoId);
    if (cachedTitle !== undefined) {
      if (titleOriginRef.current !== "user") {
        titleOriginRef.current = "automatic";
        setTitle(cachedTitle);
        setTitleLookupStatus("success");
      }
      return () => controller.abort();
    }

    if (inFlightVideoIdRef.current === videoId) {
      return () => controller.abort();
    }

    const timeoutId = window.setTimeout(async () => {
      inFlightVideoIdRef.current = videoId;
      setTitleLookupStatus("loading");

      try {
        const response = await fetch(
          `/api/youtube-title?videoId=${encodeURIComponent(videoId)}`,
          { signal: controller.signal },
        );

        if (inFlightVideoIdRef.current === videoId) {
          inFlightVideoIdRef.current = null;
        }

        if (
          requestSequence !== requestSequenceRef.current ||
          controller.signal.aborted
        ) {
          return;
        }

        if (!response.ok) {
          throw new Error("title lookup failed");
        }

        const payload: unknown = await response.json();
        const automaticTitle =
          typeof payload === "object" &&
          payload !== null &&
          "title" in payload &&
          typeof payload.title === "string"
            ? payload.title.trim()
            : "";

        if (automaticTitle.length === 0 || [...automaticTitle].length > 100) {
          throw new Error("invalid title response");
        }

        automaticTitleCacheRef.current.set(videoId, automaticTitle);

        if (titleOriginRef.current !== "user") {
          titleOriginRef.current = "automatic";
          setTitle(automaticTitle);
          setTitleLookupStatus("success");
        } else {
          setTitleLookupStatus("idle");
        }
      } catch {
        if (inFlightVideoIdRef.current === videoId) {
          inFlightVideoIdRef.current = null;
        }
        if (
          requestSequence === requestSequenceRef.current &&
          !controller.signal.aborted
        ) {
          setTitleLookupStatus("error");
        }
      }
    }, titleLookupDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
      if (inFlightVideoIdRef.current === videoId) {
        inFlightVideoIdRef.current = null;
      }
    };
  }, [videoId]);

  function handleUrlChange(value: string) {
    const nextParseResult = value.trim() ? parseYouTubeUrl(value) : null;
    const nextVideoId = nextParseResult?.ok ? nextParseResult.videoId : null;

    if (nextVideoId !== videoId) {
      setTitleLookupStatus("idle");
      if (titleOriginRef.current === "automatic") {
        titleOriginRef.current = "empty";
        setTitle("");
      }
    }

    setUrlInput(value);
    setDuplicateVideoId(null);
    setSaveError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || !parseResult?.ok) {
      return;
    }

    const store = await loadLearningStore();
    const duplicate = store.videos.find(
      (video) => video.youtubeId === parseResult.videoId,
    );

    if (duplicate) {
      setDuplicateVideoId(duplicate.youtubeId);
      setSaveError(null);
      return;
    }

    const now = new Date().toISOString();
    const saveResult = await saveLearningStore({
      ...store,
      videos: [
        ...store.videos,
        {
          youtubeId: parseResult.videoId,
          title: title.trim(),
          normalizedUrl: parseResult.normalizedUrl,
          status: "not-started",
          playbackMode: "embedded",
          playbackSeconds: 0,
          notes: [],
          segments: [],
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
            titleOriginRef.current = "user";
            setSaveError(null);
          }}
          placeholder="나중에 알아보기 쉬운 제목을 입력하세요"
          maxLength={120}
          aria-describedby={
            titleLookupStatus === "idle" ? undefined : "title-lookup-status"
          }
        />
        {titleLookupStatus === "loading" ? (
          <p id="title-lookup-status" className="form-help" role="status">
            영상 제목을 가져오는 중입니다.
          </p>
        ) : null}
        {titleLookupStatus === "success" ? (
          <p id="title-lookup-status" className="form-help" role="status">
            영상 제목을 자동으로 입력했습니다. 필요하면 수정할 수 있습니다.
          </p>
        ) : null}
        {titleLookupStatus === "error" ? (
          <p id="title-lookup-status" className="form-error" role="status">
            제목을 자동으로 가져오지 못했습니다. 직접 입력해 주세요.
          </p>
        ) : null}
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

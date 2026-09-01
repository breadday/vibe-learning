"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useReducer, useRef, useState, useSyncExternalStore } from "react";
import {
  loadLearningStore,
  saveLearningStore,
  updateCurrentVideo,
  type LearningNote,
  type LearningVideo,
} from "../lib/storage/learningStore";
import {
  createYouTubeWatchUrl,
  formatTimeInput,
  parseTimeInput,
} from "../lib/youtube/youtubePlayback";
import { YouTubeLearningPlayer, type YouTubeLearningPlayerHandle } from "./YouTubeLearningPlayer";

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
  const [noteText, setNoteText] = useState("");
  const [currentSeconds, setCurrentSeconds] = useState<number | null>(null);
  const [manualTimeInput, setManualTimeInput] = useState<string | null>(null);
  const [manualTimeError, setManualTimeError] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const playerRef = useRef<YouTubeLearningPlayerHandle>(null);
  const video: LearningVideo | null | undefined = isClient
    ? loadLearningStore().videos.find((item) => item.youtubeId === id) ?? null
    : undefined;

  function handleStatusChange(status: LearningVideo["status"]) {
    const store = loadLearningStore();
    const saveResult = saveLearningStore(
      updateCurrentVideo(store, id, new Date().toISOString(), (item) => ({
        ...item,
        status,
      })),
    );

    if (!saveResult.ok) {
      setSaveError("학습 상태를 저장하지 못했습니다. 다시 시도해 주세요.");
      return;
    }

    setSaveError(null);
    refresh();
  }

  function saveVideoUpdate(update: (current: LearningVideo) => LearningVideo) {
    const result = saveLearningStore(
      updateCurrentVideo(
        loadLearningStore(),
        id,
        new Date().toISOString(),
        update,
      ),
    );

    if (!result.ok) {
      setSaveError("개인 메모를 저장하지 못했습니다. 다시 시도해 주세요.");
      return false;
    }

    setSaveError(null);
    refresh();
    return true;
  }

  function handleAddNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = noteText.trim();
    if (!video || text.length === 0 || text.length > 2_000 || video.notes.length >= 500) {
      return;
    }

    const now = new Date().toISOString();
    const note: LearningNote = {
      id: crypto.randomUUID(),
      timestampSeconds: video.playbackMode === "external"
        ? video.playbackSeconds
        : playerRef.current?.getCurrentTime() ?? video.playbackSeconds,
      text,
      createdAt: now,
      updatedAt: now,
    };

    if (saveVideoUpdate((current) => ({
      ...current,
      notes: [...current.notes, note],
    }))) {
      setNoteText("");
    }
  }

  function handlePlaybackModeChange(playbackMode: LearningVideo["playbackMode"]) {
    if (saveVideoUpdate((current) => ({ ...current, playbackMode }))) {
      setCurrentSeconds(null);
      setManualTimeInput(null);
      setManualTimeError(null);
    }
  }

  function handleManualTimeSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!video) return;

    const seconds = parseTimeInput(manualTimeInput ?? formatTimeInput(video.playbackSeconds));
    if (seconds === null) {
      setManualTimeError("분:초 또는 시:분:초 형식으로 올바른 시간을 입력해 주세요.");
      return;
    }

    if (saveVideoUpdate((current) => ({ ...current, playbackSeconds: seconds }))) {
      setManualTimeInput(formatTimeInput(seconds));
      setManualTimeError(null);
    }
  }

  function handleTimeUpdate(seconds: number, shouldPersist: boolean) {
    setCurrentSeconds(seconds);
    if (!shouldPersist || seconds === video?.playbackSeconds) return;
    saveVideoUpdate((current) => ({ ...current, playbackSeconds: seconds }));
  }

  function handleSaveEdit(noteId: string) {
    const text = editingText.trim();
    if (text.length === 0 || text.length > 2_000) {
      return;
    }

    const now = new Date().toISOString();
    if (saveVideoUpdate((current) => ({
      ...current,
      notes: current.notes.map((note) =>
        note.id === noteId ? { ...note, text, updatedAt: now } : note,
      ),
    }))) {
      setEditingNoteId(null);
      setEditingText("");
    }
  }

  function handleDeleteNote(noteId: string) {
    if (!window.confirm("이 개인 메모를 삭제할까요?")) {
      return;
    }

    saveVideoUpdate((current) => ({
      ...current,
      notes: current.notes.filter((note) => note.id !== noteId),
    }));
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
      <article className="detail-layout">
        <div className="detail-title">
          <p className="context-label">YouTube 학습</p>
          <h1>{video.title}</h1>
        </div>
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
        <div className="detail-player-column">
          {video.playbackMode === "embedded" ? (
            <>
              <YouTubeLearningPlayer
                ref={playerRef}
                videoId={video.youtubeId}
                title={video.title}
                initialSeconds={video.playbackSeconds}
                onTimeUpdate={handleTimeUpdate}
              />
              <button
                className="playback-mode-button"
                type="button"
                onClick={() => handlePlaybackModeChange("external")}
              >
                YouTube에서 학습하기
              </button>
            </>
          ) : (
            <section className="external-playback" aria-labelledby="external-playback-heading">
              <p className="context-label">외부 재생 모드</p>
              <h2 id="external-playback-heading">이 영상은 YouTube에서 재생합니다.</h2>
              <a
                className="youtube-watch-button"
                href={createYouTubeWatchUrl(video.youtubeId, video.playbackSeconds)}
                target="_blank"
                rel="noreferrer"
              >
                YouTube에서 보기
              </a>
              <form className="manual-time-form" onSubmit={handleManualTimeSave}>
                <label htmlFor="manual-playback-time">마지막 학습 위치</label>
                <div>
                  <input
                    id="manual-playback-time"
                    value={manualTimeInput ?? formatTimeInput(video.playbackSeconds)}
                    onChange={(event) => setManualTimeInput(event.target.value)}
                    inputMode="numeric"
                    placeholder="12:43"
                    aria-describedby="manual-time-help"
                    aria-invalid={manualTimeError !== null}
                  />
                  <button type="submit">위치 저장</button>
                </div>
                <small id="manual-time-help">분:초 또는 시:분:초</small>
                {manualTimeError ? <p className="form-error" role="alert">{manualTimeError}</p> : null}
              </form>
              <button
                className="playback-mode-button"
                type="button"
                onClick={() => handlePlaybackModeChange("embedded")}
              >
                앱에서 재생 시도
              </button>
            </section>
          )}
        </div>
        <section className="personal-notes" aria-labelledby="personal-notes-heading">
          <div className="personal-notes-heading">
            <h2 id="personal-notes-heading">개인 메모</h2>
            <span>{video.notes.length}/500</span>
          </div>
          <form className="note-form" onSubmit={handleAddNote}>
            <div className="note-position" aria-live="polite">
              현재 위치 <strong>{formatTimestamp(
                video.playbackMode === "external"
                  ? video.playbackSeconds
                  : currentSeconds ?? video.playbackSeconds,
              )}</strong>
              <span>에 저장됩니다</span>
            </div>
            <label className="sr-only" htmlFor="new-note">메모 내용</label>
            <textarea
              id="new-note"
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              maxLength={2_000}
              rows={3}
              placeholder="메모를 입력하세요"
            />
            <div>
              <small>{noteText.length}/2,000자</small>
              <button
                type="submit"
                disabled={noteText.trim().length === 0 || video.notes.length >= 500}
              >
                메모 저장
              </button>
            </div>
          </form>
          {video.notes.length === 0 ? (
            <p className="empty-notes">아직 작성한 개인 메모가 없습니다.</p>
          ) : (
            <ol className="note-list">
              {video.notes.map((note) => (
                <li key={note.id}>
                  {editingNoteId === note.id ? (
                    <div className="note-edit-form">
                      <label className="sr-only" htmlFor={`edit-note-${note.id}`}>
                        메모 수정 내용
                      </label>
                      <textarea
                        id={`edit-note-${note.id}`}
                        value={editingText}
                        onChange={(event) => setEditingText(event.target.value)}
                        maxLength={2_000}
                        rows={3}
                      />
                      <div className="note-actions">
                        <button type="button" onClick={() => handleSaveEdit(note.id)}>
                          저장
                        </button>
                        <button type="button" onClick={() => setEditingNoteId(null)}>
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        className="note-timestamp"
                        type="button"
                        aria-label={`${formatTimestamp(note.timestampSeconds)} 위치로 이동`}
                        onClick={() => {
                          if (video.playbackMode === "external") {
                            window.open(
                              createYouTubeWatchUrl(video.youtubeId, note.timestampSeconds),
                              "_blank",
                              "noopener,noreferrer",
                            );
                          } else {
                            playerRef.current?.seekTo(note.timestampSeconds);
                          }
                        }}
                      >
                        {formatTimestamp(note.timestampSeconds)}
                      </button>
                      <p>{note.text}</p>
                      <div className="note-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteId(note.id);
                            setEditingText(note.text);
                          }}
                        >
                          수정
                        </button>
                        <button type="button" onClick={() => handleDeleteNote(note.id)}>
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
        <p className="saved-video-id">YouTube 영상 · {video.youtubeId}</p>
      </article>
    </main>
  );
}

export function formatTimestamp(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = String(seconds % 60).padStart(2, "0");

  return hours > 0
    ? `[${hours}:${String(minutes).padStart(2, "0")}:${remainder}]`
    : `[${minutes}:${remainder}]`;
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

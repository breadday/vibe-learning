"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useReducer, useState, useSyncExternalStore } from "react";
import {
  loadLearningStore,
  saveLearningStore,
  updateCurrentVideo,
  type LearningNote,
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
  const [noteText, setNoteText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
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
      timestampSeconds: video.playbackSeconds,
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
        <section className="personal-notes" aria-labelledby="personal-notes-heading">
          <div className="personal-notes-heading">
            <div>
              <p className="context-label">이 브라우저에만 저장</p>
              <h2 id="personal-notes-heading">개인 메모</h2>
            </div>
            <span>{video.notes.length}/500</span>
          </div>
          <form className="note-form" onSubmit={handleAddNote}>
            <label htmlFor="new-note">메모 내용</label>
            <textarea
              id="new-note"
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              maxLength={2_000}
              rows={4}
              placeholder="영상에서 기억할 내용을 적어 두세요"
            />
            <div>
              <small>{noteText.length}/2,000자</small>
              <button
                type="submit"
                disabled={noteText.trim().length === 0 || video.notes.length >= 500}
              >
                메모 추가
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
                        rows={4}
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

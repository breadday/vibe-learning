"use client";

import { type FormEvent, useState } from "react";
import type { LearningSegment } from "../lib/storage/learningStore";
import { createYouTubeWatchUrl, formatTimeInput, parseTimeInput } from "../lib/youtube/youtubePlayback";

type Props = { segments: LearningSegment[]; youtubeId: string; mode: "embedded" | "external"; currentSeconds: number; onSave: (segments: LearningSegment[]) => boolean; onPlay: (segment: LearningSegment) => void };
type Draft = { title: string; start: string; end: string };
const emptyDraft: Draft = { title: "", start: "", end: "" };

export function LearningSegments({ segments, youtubeId, mode, currentSeconds, onSave, onPlay }: Props) {
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const setField = (field: keyof Draft, value: string) => setDraft((current) => ({ ...current, [field]: value }));

  function submit(event: FormEvent) {
    event.preventDefault();
    const title = draft.title.trim();
    const startSeconds = parseTimeInput(draft.start);
    const endSeconds = parseTimeInput(draft.end);
    if (!title) return setError("구간 제목을 입력해 주세요.");
    if (startSeconds === null) return setError("시작 시간을 분:초 또는 시:분:초 형식으로 입력해 주세요.");
    if (endSeconds === null) return setError("종료 시간을 분:초 또는 시:분:초 형식으로 입력해 주세요.");
    if (endSeconds <= startSeconds) return setError("종료 시간은 시작 시간보다 커야 합니다.");
    const now = new Date().toISOString();
    const next = editingId ? segments.map((segment) => segment.id === editingId ? { ...segment, title, startSeconds, endSeconds, updatedAt: now } : segment) : [...segments, { id: crypto.randomUUID(), title, startSeconds, endSeconds, createdAt: now, updatedAt: now }];
    if (onSave([...next].sort((a, b) => a.startSeconds - b.startSeconds))) { setDraft(emptyDraft); setEditingId(null); setError(null); }
  }

  return <section className="learning-segments" aria-labelledby="learning-segments-heading">
    <div className="learning-segments-heading"><div><p className="context-label">나만의 타임라인</p><h2 id="learning-segments-heading">학습 구간</h2></div><span>{segments.length}개</span></div>
    <form className="segment-form" onSubmit={submit}>
      <label>구간 제목<input value={draft.title} onChange={(e) => setField("title", e.target.value)} /></label>
      <label>시작 시간<input aria-label="구간 시작 시간" inputMode="numeric" placeholder="00:00" value={draft.start} onChange={(e) => setField("start", e.target.value)} /></label>
      <button type="button" onClick={() => setField("start", formatTimeInput(currentSeconds))}>{mode === "embedded" ? "현재 위치" : "마지막 위치"} 적용</button>
      <label>종료 시간<input aria-label="구간 종료 시간" inputMode="numeric" placeholder="00:00" value={draft.end} onChange={(e) => setField("end", e.target.value)} /></label>
      <button type="button" onClick={() => setField("end", formatTimeInput(currentSeconds))}>{mode === "embedded" ? "현재 위치" : "마지막 위치"} 적용</button>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="segment-form-actions"><button type="submit">{editingId ? "구간 수정 저장" : "구간 추가"}</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft); setError(null); }}>취소</button> : null}</div>
    </form>
    {segments.length === 0 ? <p className="empty-segments">아직 저장한 학습 구간이 없습니다.</p> : <ol className="learning-segment-list">{segments.map((segment) => <li key={segment.id}>
      <div><strong>{segment.title}</strong><span>{formatSegmentTime(segment.startSeconds)}–{formatSegmentTime(segment.endSeconds)}</span></div>
      <div className="learning-segment-actions">{mode === "embedded" ? <button type="button" onClick={() => onPlay(segment)}>구간 재생</button> : <a href={createYouTubeWatchUrl(youtubeId, segment.startSeconds)} target="_blank" rel="noreferrer">YouTube에서 시작</a>}<button type="button" onClick={() => { setEditingId(segment.id); setDraft({ title: segment.title, start: formatTimeInput(segment.startSeconds), end: formatTimeInput(segment.endSeconds) }); setError(null); }}>수정</button><button type="button" onClick={() => { if (window.confirm("이 학습 구간을 삭제할까요?")) onSave(segments.filter((item) => item.id !== segment.id)); }}>삭제</button></div>
    </li>)}</ol>}
  </section>;
}

export function formatSegmentTime(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = String(seconds % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${remainder}`
    : `${String(minutes).padStart(2, "0")}:${remainder}`;
}

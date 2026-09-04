"use client";

import { useState, type ReactNode } from "react";
import type { VideoContent } from "@/lib/content/schema";
import { CopyBlock } from "@/components/CopyBlock";
import { SourceList } from "@/components/SourceList";

const labels = { required: "필수", optional: "선택", reference: "참고" } as const;

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function LearningWorkspace({ content, mdxContent }: { content: VideoContent; mdxContent?: ReactNode }) {
  const { video, segments, practiceSteps, copyBlocks, concepts, warnings, sources } = content;
  const [startSeconds, setStartSeconds] = useState(0);
  const requiredSeconds = segments.filter((segment) => segment.type === "required").reduce((total, segment) => total + segment.endSeconds - segment.startSeconds, 0);
  const playerSrc = video.youtubeId ? `https://www.youtube-nocookie.com/embed/${video.youtubeId}?start=${startSeconds}&autoplay=${startSeconds > 0 ? 1 : 0}` : null;

  function moveToSegment(seconds: number) {
    setStartSeconds(seconds);
    document.querySelector("#video")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return <main>
    <header className="site-header"><a className="brand" href="#top"><span>V</span> Vibe Learning</a><nav aria-label="학습 메뉴"><a href="#summary">핵심</a><a href="#segments">구간</a><a href="#practice">실습</a></nav></header>
    <article id="top" className="learning-page">
      <section className="intro-grid"><div className="hero-copy"><p className="context-label">오늘의 바이브코딩 학습</p><h1>{video.title}</h1><p className="value-copy">14분 안에 코딩 에이전트의 구조와 안전한 권한 설정을 이해합니다.</p><div className="learning-stats" aria-label="학습 시간"><span><strong>{Math.ceil((video.durationSeconds ?? 0) / 60)}분</strong>전체 영상</span><span><strong>{Math.ceil(requiredSeconds / 60)}분</strong>필수 구간</span><span><strong>3단계</strong>학습 과정</span></div><div className="hero-actions"><button onClick={() => moveToSegment(segments[0]?.startSeconds ?? 0)}>필수 구간부터 보기</button><a href="#summary">3줄 핵심 먼저 읽기</a></div></div>
        <aside className="route-card"><span>오늘의 학습 순서</span><ol><li><b>이해하기</b><small>핵심 3줄</small></li><li><b>골라 보기</b><small>필수 구간 4개</small></li><li><b>직접 해보기</b><small>안전 점검 실습</small></li></ol></aside></section>
      <section id="video" className="video-shell">{playerSrc ? <iframe key={startSeconds} src={playerSrc} title={video.title ?? "YouTube 학습 영상"} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <p>영상 연결 대기</p>}</section>
      {mdxContent ? <section className="mdx-section">{mdxContent}</section> : null}
      <div className="workspace-grid"><div className="main-flow">
        <section id="summary" className="step-section"><div className="step-heading"><span>1</span><div><p>이해하기</p><h2>이 영상의 핵심 3줄</h2></div></div><ul className="key-points"><li>코딩 에이전트는 답변을 넘어 파일을 읽고 수정하며 테스트까지 실행합니다.</li><li>MCP는 외부 도구를 연결하지만, 실제 능력과 위험은 허용한 권한에 따라 달라집니다.</li><li>좋은 개발은 작성으로 끝나지 않고 실행 → 확인 → 수정 → 재검증을 반복합니다.</li></ul></section>
        <section id="segments" className="step-section"><div className="step-heading"><span>2</span><div><p>골라 보기</p><h2>필요한 구간만 바로 보기</h2></div></div><div className="segment-list">{segments.map((segment) => <button className="segment-card" key={`${segment.startSeconds}-${segment.endSeconds}`} onClick={() => moveToSegment(segment.startSeconds)}><span className={`segment-label ${segment.type}`}>{labels[segment.type]}</span><span className="segment-time">{formatTime(segment.startSeconds)}–{formatTime(segment.endSeconds)}</span><strong>{segment.title}</strong><small>{segment.reason}</small><i>이 구간 보기 →</i></button>)}</div></section>
        <section id="practice" className="step-section"><div className="step-heading"><span>3</span><div><p>직접 해보기</p><h2>안전한 환경을 직접 설계하기</h2></div></div><ol className="practice-list">{practiceSteps.map((step, index) => <li key={step.title}><span>{index + 1}</span><div><strong>{step.title}</strong><p>{step.instruction}</p></div></li>)}</ol>{copyBlocks[0] && <div className="practice-tool"><p>실습에 바로 쓰는 프롬프트</p><CopyBlock title={copyBlocks[0].title} value={copyBlocks[0].content} language={copyBlocks[0].language} /></div>}</section>
      </div><aside className="side-notes"><details open><summary>학습 전 꼭 확인</summary><p>{warnings[0]}</p></details><details><summary>핵심 개념 {concepts.length}개</summary><dl>{concepts.map((concept) => <div key={concept.term}><dt>{concept.term}</dt><dd>{concept.description}</dd></div>)}</dl></details><details><summary>주의사항 더 보기</summary><ul>{warnings.slice(1).map((warning) => <li key={warning}>{warning}</li>)}</ul></details><details><summary>공식자료와 원본</summary><SourceList sources={sources} /></details><p className="verified-note">영상 내용 검수 완료 · 기능 정보는 {content.freshness.checkedAt} 기준</p></aside></div>
    </article><footer>AI 호출 없이 저장된 검수 자료로 학습합니다.</footer>
  </main>;
}

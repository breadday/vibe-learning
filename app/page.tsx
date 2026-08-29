import FirstVideoArticle from "@/content/reviewed/first-video.mdx";
import { CopyBlock } from "@/components/CopyBlock";
import { EmptyState, PracticeSteps } from "@/components/PracticeSteps";
import { SourceList } from "@/components/SourceList";
import { VideoSegment } from "@/components/VideoSegment";
import { WarningBox } from "@/components/WarningBox";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { firstVideo } from "@/lib/content/first-video";

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="content-section">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="section-title">{title}</h2>
      {children}
    </section>
  );
}

export default function Home() {
  const { video, segments, practiceSteps, copyBlocks, concepts, warnings, sources, todo } = firstVideo;
  const title = video.title ?? "첫 영상 제목 확인 대기";

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Vibe Learning 처음으로">
          <span>V</span> Vibe Learning
        </a>
        <span className="version">v0.1 · 첫 학습</span>
      </header>

      <article id="top" className="learning-page">
        <div className="hero-copy">
          <div className="status-row">
            <span className="status-badge">검수 대기</span>
            <span>최신성 미확인</span>
          </div>
          <h1>{title}</h1>
          <p className="video-meta">
            <span>{video.channel ?? "채널 TODO"}</span>
            <span aria-hidden="true">·</span>
            <span>{video.publishedAt ?? "게시일 TODO"}</span>
            <span aria-hidden="true">·</span>
            <span>{video.language ?? "언어 TODO"}</span>
          </p>
        </div>

        <YouTubePlayer videoId={video.youtubeId} title={video.title} />

        <div className="article-body">
          <section className="mdx-content"><FirstVideoArticle /></section>

          <Section eyebrow="WATCH" title="꼭 볼 구간">
            {segments.length > 0 && video.originalUrl ? (
              <div className="segment-list">
                {segments.map((segment) => (
                  <VideoSegment key={`${segment.startSeconds}-${segment.endSeconds}`} segment={segment} videoUrl={video.originalUrl!} />
                ))}
              </div>
            ) : <EmptyState text="TODO: 자막과 영상 길이를 확인한 뒤 필수·선택·참고 구간을 등록합니다." />}
          </Section>

          <Section eyebrow="PRACTICE" title="직접 해보기">
            <PracticeSteps steps={practiceSteps} />
          </Section>

          <Section eyebrow="COPY & RUN" title="복사할 프롬프트와 코드">
            {copyBlocks.length > 0 ? copyBlocks.map((block) => (
              <CopyBlock key={block.title} title={block.title} value={block.content} language={block.language} />
            )) : <CopyBlock title="검수된 자료 대기" value={null} />}
          </Section>

          <Section eyebrow="CONCEPTS" title="핵심 개념">
            {concepts.length > 0 ? (
              <dl className="concept-list">{concepts.map((concept) => (
                <div key={concept.term}><dt>{concept.term}</dt><dd>{concept.description}</dd></div>
              ))}</dl>
            ) : <EmptyState text="TODO: 영상에서 확인한 핵심 개념을 정리합니다." />}
          </Section>

          <Section eyebrow="CAUTION" title="주의사항">
            <WarningBox>
              <strong>검증 전 콘텐츠입니다.</strong>
              <p>영상 정보나 자막을 받기 전까지 요약·구간·프롬프트를 사실로 작성하지 않습니다.</p>
            </WarningBox>
            {warnings.map((warning) => <WarningBox key={warning}>{warning}</WarningBox>)}
          </Section>

          <Section eyebrow="SOURCES" title="공식자료와 관련 영상">
            <SourceList sources={sources} />
          </Section>

          <aside className="todo-panel">
            <span className="eyebrow">NEXT INPUT</span>
            <h2>완성을 위해 필요한 정보</h2>
            <ul>{todo.map((item) => <li key={item}>{item}</li>)}</ul>
          </aside>
        </div>
      </article>

      <footer>개인 학습용 · 확인된 정보만 제공합니다.</footer>
    </main>
  );
}

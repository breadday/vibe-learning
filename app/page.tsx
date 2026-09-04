import Link from "next/link";
import { AddVideoForm } from "@/components/AddVideoForm";
import { BackupRestore } from "@/components/BackupRestore";
import { LearningLibrary } from "@/components/LearningLibrary";
import { listReviewedContent } from "@/lib/content/loadReviewedContent";

export default async function Home() {
  const reviewedContents = await listReviewedContent();
  return (
    <main className="add-video-page">
      <header className="site-header">
        <a className="brand" href="#top"><span>V</span> Vibe Learning</a>
        <span className="local-only">브라우저에만 안전하게 저장</span>
      </header>
      <section id="top" className="add-video-hero">
        <div>
          <p className="context-label">나만의 YouTube 학습 목록</p>
          <h1>보고 끝내지 말고,<br />학습으로 남기세요.</h1>
          <p className="value-copy">
            YouTube 주소와 직접 정한 제목만으로 학습을 시작할 수 있습니다.
            로그인이나 외부 API는 필요하지 않습니다.
          </p>
        </div>
        <AddVideoForm />
      </section>
      {reviewedContents.length > 0 ? (
        <section className="learning-library" aria-label="추천 학습 콘텐츠">
          <div className="library-section">
            <div className="library-heading">
              <p>추천 학습 콘텐츠</p>
              <h2>검수 완료된 학습으로 바로 시작</h2>
            </div>
            <div className="learning-card-grid">
              {reviewedContents.map((content) => (
                <article className="learning-video-card" key={content.slug}>
                  <div
                    className="library-thumbnail"
                    role="img"
                    aria-label={content.video.title ?? undefined}
                    style={content.video.youtubeId ? { backgroundImage: `url(https://i.ytimg.com/vi/${content.video.youtubeId}/hqdefault.jpg)` } : undefined}
                  />
                  <div className="learning-card-copy">
                    <span className="status-badge completed">검수 완료</span>
                    <h3>{content.video.title}</h3>
                    <small>{content.video.channel} · {Math.ceil((content.video.durationSeconds ?? 0) / 60)}분</small>
                    <div className="learning-card-actions">
                      <Link href={`/learn/${content.slug}`}>학습 시작 →</Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      <LearningLibrary />
      <BackupRestore />
    </main>
  );
}

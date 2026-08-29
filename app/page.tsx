import { AddVideoForm } from "@/components/AddVideoForm";
import { BackupRestore } from "@/components/BackupRestore";
import { LearningLibrary } from "@/components/LearningLibrary";

export default function Home() {
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
      <LearningLibrary />
      <BackupRestore />
    </main>
  );
}

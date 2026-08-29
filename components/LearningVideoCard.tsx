import Link from "next/link";
import type { LearningVideo } from "../lib/storage/learningStore";

const statusLabels = {
  "not-started": "학습 전",
  "in-progress": "학습 중",
  completed: "완료",
} as const;

type LearningVideoCardProps = {
  video: LearningVideo;
  onDelete?: (video: LearningVideo) => void;
  onOpen?: (videoId: string) => void;
};

export function LearningVideoCard({
  video,
  onDelete,
  onOpen,
}: LearningVideoCardProps) {
  return (
    <article className="learning-video-card">
      <div
        className="library-thumbnail"
        role="img"
        aria-label={`${video.title} 썸네일`}
        style={{
          backgroundImage: `url("https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg")`,
        }}
      />
      <div className="learning-card-copy">
        <span className={`status-badge ${video.status}`}>
          {statusLabels[video.status]}
        </span>
        <h3>{video.title}</h3>
        <small>최근 수정 {formatDate(video.updatedAt)}</small>
        <div className="learning-card-actions">
          <Link
            href={`/videos/${video.youtubeId}`}
            onClick={() => onOpen?.(video.youtubeId)}
          >
            학습 열기
          </Link>
          {onDelete ? (
            <button type="button" onClick={() => onDelete(video)}>
              삭제
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

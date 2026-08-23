type YouTubePlayerProps = {
  videoId: string | null;
  title: string | null;
};

export function YouTubePlayer({ videoId, title }: YouTubePlayerProps) {
  if (!videoId) {
    return (
      <div className="player-placeholder" role="status">
        <span className="player-icon" aria-hidden="true">▶</span>
        <strong>영상 연결 대기</strong>
        <p>실제 YouTube URL이 확인되면 이곳에 플레이어가 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="player-frame">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title={title ?? "YouTube 학습 영상"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

import type { VideoContent } from "@/lib/content/schema";

type Segment = VideoContent["segments"][number];

const labels = { required: "필수", optional: "선택", reference: "참고" } as const;

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function VideoSegment({ segment, videoUrl }: { segment: Segment; videoUrl: string }) {
  const separator = videoUrl.includes("?") ? "&" : "?";
  const href = `${videoUrl}${separator}t=${segment.startSeconds}s`;

  return (
    <a className="segment-card" href={href} target="_blank" rel="noreferrer">
      <div className="segment-meta">
        <span className={`segment-label ${segment.type}`}>{labels[segment.type]}</span>
        <span>{formatTime(segment.startSeconds)}–{formatTime(segment.endSeconds)}</span>
      </div>
      <strong>{segment.title}</strong>
      <p>{segment.reason}</p>
    </a>
  );
}

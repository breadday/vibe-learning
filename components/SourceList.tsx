import type { VideoContent } from "@/lib/content/schema";
import { EmptyState } from "./PracticeSteps";

export function SourceList({ sources }: { sources: VideoContent["sources"] }) {
  if (sources.length === 0) return <EmptyState text="TODO: 원본 영상과 공식자료 링크를 확인합니다." />;
  return (
    <ul className="source-list">
      {sources.map((source) => (
        <li key={source.url}>
          <a href={source.url} target="_blank" rel="noreferrer">
            <span>{source.type === "official" ? "공식자료" : source.type === "original" ? "원본" : "관련 영상"}</span>
            <strong>{source.title}</strong>
            <span aria-hidden="true">↗</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

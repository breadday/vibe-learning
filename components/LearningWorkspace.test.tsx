import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LearningWorkspace } from "./LearningWorkspace";
import { videoContentSchema, type VideoContent } from "../lib/content/schema";

function reviewedContent(videoOverrides: Partial<VideoContent["video"]> = {}): VideoContent {
  return videoContentSchema.parse({
    schemaVersion: 1,
    verificationStatus: "reviewed",
    slug: "test-video",
    video: {
      youtubeId: "abcdefghijk",
      title: "테스트 영상",
      channel: "테스트 채널",
      publishedAt: "2026-08-01",
      durationSeconds: 600,
      language: "ko",
      originalUrl: "https://www.youtube.com/watch?v=abcdefghijk",
      ...videoOverrides,
    },
    freshness: { status: "current", checkedAt: "2026-08-23", reason: "검수 완료" },
    segments: [
      { type: "required", startSeconds: 10, endSeconds: 30, title: "첫 구간", reason: "핵심 설명" },
      { type: "optional", startSeconds: 40, endSeconds: 60, title: "둘째 구간", reason: "보충 설명" },
    ],
    practiceSteps: [{ title: "실습 하나", instruction: "따라 해보기" }],
    copyBlocks: [],
    concepts: [],
    warnings: ["주의 사항 한 개"],
    sources: [],
    todo: [],
  });
}

describe("LearningWorkspace", () => {
  it("falls back to derived copy when optional fields are absent", () => {
    render(<LearningWorkspace content={reviewedContent()} />);
    expect(screen.getByText("10분 안에 테스트 영상을 이해합니다.")).toBeInTheDocument();
    expect(screen.getAllByText("이해하기")).toHaveLength(2);
    expect(screen.getAllByText("핵심 3줄")).toHaveLength(2);
    expect(screen.getAllByText("골라 보기")).toHaveLength(2);
    expect(screen.getAllByText("직접 해보기")).toHaveLength(2);
    expect(screen.getByText("필수 구간 1개")).toBeInTheDocument();
    expect(screen.getByText("실습 1단계")).toBeInTheDocument();
  });

  it("renders presentation fields from the content data", () => {
    render(
      <LearningWorkspace
        content={reviewedContent({
          introDescription: "인트로 설명 문장",
          summaryTitle: "이 영상의 핵심",
          summarySectionTitle: "요약",
          segmentsSectionTitle: "구간",
          practiceSectionTitle: "실습",
        })}
      />,
    );
    expect(screen.getByText("인트로 설명 문장")).toBeInTheDocument();
    expect(screen.getByText("이 영상의 핵심")).toBeInTheDocument();
    expect(screen.getAllByText("요약")).toHaveLength(2);
    expect(screen.getAllByText("구간")).toHaveLength(3);
    expect(screen.getAllByText("실습")).toHaveLength(3);
    expect(screen.getByText("필수 구간 1개")).toBeInTheDocument();
  });
});

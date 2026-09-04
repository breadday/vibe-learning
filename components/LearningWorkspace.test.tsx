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
    expect(screen.getByText("10분 안에 테스트 영상 이해하기")).toBeInTheDocument();
    expect(screen.getByText("오늘의 바이브코딩 학습")).toBeInTheDocument();
    expect(screen.getAllByText("이해하기")).toHaveLength(2);
    expect(screen.getAllByText("핵심 3줄")).toHaveLength(2);
    expect(screen.getAllByText("골라 보기")).toHaveLength(2);
    expect(screen.getAllByText("직접 해보기")).toHaveLength(2);
    expect(screen.getByText("필수 구간 1개")).toBeInTheDocument();
    expect(screen.getByText("실습 1단계")).toBeInTheDocument();
    expect(screen.getByText("필요한 구간만 바로 보기")).toBeInTheDocument();
    expect(screen.getByText("안전한 환경을 직접 설계하기")).toBeInTheDocument();
    expect(
      screen.getByText("코딩 에이전트는 답변을 넘어 파일을 읽고 수정하며 테스트까지 실행합니다."),
    ).toBeInTheDocument();
    expect(screen.getByText("필수 구간부터 보기")).toBeInTheDocument();
    expect(screen.getByText("3줄 핵심 먼저 읽기")).toBeInTheDocument();
    expect(screen.getAllByText("핵심")).toHaveLength(1);
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
          segmentsTitle: "보고 싶은 구간만",
          practiceTitle: "직접 해보는 실습",
          keyPoints: ["핵심 문장 하나"],
          contextLabel: "오늘의 추천 학습",
          navItems: [
            { label: "목차", href: "#summary" },
            { label: "연습", href: "#practice" },
          ],
          heroPrimaryCta: "학습 시작",
          heroSecondaryCta: "요약 읽기",
        })}
      />,
    );
    expect(screen.getByText("인트로 설명 문장")).toBeInTheDocument();
    expect(screen.getByText("오늘의 추천 학습")).toBeInTheDocument();
    expect(screen.getByText("이 영상의 핵심")).toBeInTheDocument();
    expect(screen.getAllByText("요약")).toHaveLength(2);
    expect(screen.getAllByText("구간")).toHaveLength(2);
    expect(screen.getAllByText("실습")).toHaveLength(2);
    expect(screen.getByText("보고 싶은 구간만")).toBeInTheDocument();
    expect(screen.getByText("직접 해보는 실습")).toBeInTheDocument();
    expect(screen.getByText("핵심 문장 하나")).toBeInTheDocument();
    expect(
      screen.queryByText("코딩 에이전트는 답변을 넘어 파일을 읽고 수정하며 테스트까지 실행합니다."),
    ).toBeNull();
    expect(screen.getByText("목차")).toBeInTheDocument();
    expect(screen.getByText("연습")).toBeInTheDocument();
    expect(screen.getByText("학습 시작")).toBeInTheDocument();
    expect(screen.getByText("요약 읽기")).toBeInTheDocument();
    expect(screen.getByText("필수 구간 1개")).toBeInTheDocument();
  });
});

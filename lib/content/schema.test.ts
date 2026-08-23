import { describe, expect, it } from "vitest";
import { videoContentSchema } from "./schema";

function validContent() {
  return {
    schemaVersion: 1 as const,
    verificationStatus: "reviewed" as const,
    slug: "test-video",
    video: {
      youtubeId: "abcdefghijk",
      title: "검증된 제목",
      channel: "검증된 채널",
      publishedAt: "2026-08-01",
      durationSeconds: 600,
      language: "ko" as const,
      originalUrl: "https://www.youtube.com/watch?v=abcdefghijk",
    },
    freshness: { status: "current" as const, checkedAt: "2026-08-23", reason: "검수 완료" },
    segments: [
      { type: "required" as const, startSeconds: 10, endSeconds: 30, title: "첫 구간", reason: "핵심 설명" },
      { type: "optional" as const, startSeconds: 40, endSeconds: 60, title: "둘째 구간", reason: "보충 설명" },
    ],
    practiceSteps: [], copyBlocks: [], concepts: [], warnings: [], sources: [], todo: [],
  };
}

describe("videoContentSchema", () => {
  it("accepts valid, non-overlapping segments", () => {
    expect(videoContentSchema.safeParse(validContent()).success).toBe(true);
  });

  it("rejects reversed and overlapping segments", () => {
    const reversed = validContent();
    reversed.segments[0].startSeconds = 30;
    reversed.segments[0].endSeconds = 10;
    expect(videoContentSchema.safeParse(reversed).success).toBe(false);

    const overlapping = validContent();
    overlapping.segments[1].startSeconds = 20;
    expect(videoContentSchema.safeParse(overlapping).success).toBe(false);
  });

  it("rejects segments beyond the video duration", () => {
    const content = validContent();
    content.segments[1].endSeconds = 601;
    expect(videoContentSchema.safeParse(content).success).toBe(false);
  });

  it("requires a known video duration when segments exist", () => {
    const content = {
      ...validContent(),
      video: { ...validContent().video, durationSeconds: null },
    };

    const result = videoContentSchema.safeParse(content);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ path: ["video", "durationSeconds"] }),
      );
    }
  });

  it("limits required segments to five and optional segments to three", () => {
    const required = validContent();
    required.segments = Array.from({ length: 6 }, (_, index) => ({
      type: "required" as const,
      startSeconds: index * 20,
      endSeconds: index * 20 + 10,
      title: `필수 ${index}`,
      reason: "검증 이유",
    }));
    expect(videoContentSchema.safeParse(required).success).toBe(false);

    const optional = validContent();
    optional.segments = Array.from({ length: 4 }, (_, index) => ({
      type: "optional" as const,
      startSeconds: index * 20,
      endSeconds: index * 20 + 10,
      title: `선택 ${index}`,
      reason: "검증 이유",
    }));
    expect(videoContentSchema.safeParse(optional).success).toBe(false);
  });
});

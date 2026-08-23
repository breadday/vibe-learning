import { z } from "zod";

const segmentSchema = z.object({
  type: z.enum(["required", "optional", "reference"]),
  startSeconds: z.number().int().nonnegative(),
  endSeconds: z.number().int().positive(),
  title: z.string().min(1),
  reason: z.string().min(1),
});

export const videoContentSchema = z
  .object({
    schemaVersion: z.literal(1),
    verificationStatus: z.enum(["pending", "reviewed"]),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    video: z.object({
      youtubeId: z.string().regex(/^[\w-]{11}$/).nullable(),
      title: z.string().min(1).nullable(),
      channel: z.string().min(1).nullable(),
      publishedAt: z.iso.date().nullable(),
      durationSeconds: z.number().int().positive().nullable(),
      language: z.enum(["ko", "en"]).nullable(),
      originalUrl: z.url().startsWith("https://").nullable(),
    }),
    freshness: z.object({
      status: z.enum(["current", "review-needed", "unverified"]),
      checkedAt: z.iso.date().nullable(),
      reason: z.string().min(1),
    }),
    segments: z.array(segmentSchema),
    practiceSteps: z.array(
      z.object({ title: z.string().min(1), instruction: z.string().min(1) }),
    ),
    copyBlocks: z.array(
      z.object({
        kind: z.enum(["prompt", "code"]),
        title: z.string().min(1),
        language: z.string().min(1),
        content: z.string().min(1),
      }),
    ),
    concepts: z.array(
      z.object({ term: z.string().min(1), description: z.string().min(1) }),
    ),
    warnings: z.array(z.string().min(1)),
    sources: z.array(
      z.object({
        type: z.enum(["official", "original", "related"]),
        title: z.string().min(1),
        url: z.url().startsWith("https://"),
      }),
    ),
    todo: z.array(z.string().min(1)),
  })
  .superRefine((content, context) => {
    const requiredCount = content.segments.filter(
      (segment) => segment.type === "required",
    ).length;
    const optionalCount = content.segments.filter(
      (segment) => segment.type === "optional",
    ).length;

    if (requiredCount > 5) {
      context.addIssue({ code: "custom", path: ["segments"], message: "필수 구간은 최대 5개입니다." });
    }
    if (optionalCount > 3) {
      context.addIssue({ code: "custom", path: ["segments"], message: "선택 구간은 최대 3개입니다." });
    }
    if (content.segments.length > 0 && content.video.durationSeconds === null) {
      context.addIssue({
        code: "custom",
        path: ["video", "durationSeconds"],
        message: "영상 구간을 등록하려면 영상 길이를 먼저 확인해야 합니다.",
      });
    }

    const sortedSegments = [...content.segments].sort(
      (left, right) => left.startSeconds - right.startSeconds,
    );
    sortedSegments.forEach((segment, index) => {
      if (segment.startSeconds >= segment.endSeconds) {
        context.addIssue({ code: "custom", path: ["segments"], message: "구간 시작은 종료보다 빨라야 합니다." });
      }
      if (
        content.video.durationSeconds !== null &&
        segment.endSeconds > content.video.durationSeconds
      ) {
        context.addIssue({ code: "custom", path: ["segments"], message: "구간이 영상 길이를 초과합니다." });
      }
      if (index > 0 && sortedSegments[index - 1].endSeconds > segment.startSeconds) {
        context.addIssue({ code: "custom", path: ["segments"], message: "영상 구간은 서로 겹칠 수 없습니다." });
      }
    });
  });

export type VideoContent = z.infer<typeof videoContentSchema>;

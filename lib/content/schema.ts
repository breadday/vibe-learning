import { z } from "zod";

const nonEmptyText = z.string().trim().min(1);
const httpsUrl = z.url({ protocol: /^https$/ });

const segmentSchema = z.object({
  type: z.enum(["required", "optional", "reference"]),
  startSeconds: z.number().int().nonnegative(),
  endSeconds: z.number().int().positive(),
  title: nonEmptyText,
  reason: nonEmptyText,
}).strict();

const videoSchema = z.object({
  youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/).nullable(),
  title: nonEmptyText.nullable(),
  channel: nonEmptyText.nullable(),
  publishedAt: z.iso.date().nullable(),
  durationSeconds: z.number().int().positive().nullable(),
  language: z.enum(["ko", "en"]).nullable(),
  originalUrl: httpsUrl.nullable(),
  subtitle: nonEmptyText.nullable().optional(),
  introDescription: nonEmptyText.nullable().optional(),
  summaryTitle: nonEmptyText.nullable().optional(),
  summarySectionTitle: nonEmptyText.nullable().optional(),
  segmentsSectionTitle: nonEmptyText.nullable().optional(),
  practiceSectionTitle: nonEmptyText.nullable().optional(),
  segmentsTitle: nonEmptyText.nullable().optional(),
  practiceTitle: nonEmptyText.nullable().optional(),
  keyPoints: z.array(nonEmptyText).nullable().optional(),
  contextLabel: nonEmptyText.nullable().optional(),
  navItems: z
    .array(z.object({ label: nonEmptyText, href: nonEmptyText }).strict())
    .nullable()
    .optional(),
  heroPrimaryCta: nonEmptyText.nullable().optional(),
  heroSecondaryCta: nonEmptyText.nullable().optional(),
}).strict();

export const videoContentSchema = z.object({
  schemaVersion: z.literal(1),
  verificationStatus: z.enum(["pending", "reviewed"]),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  video: videoSchema,
  freshness: z.object({
    status: z.enum(["current", "review-needed", "unverified"]),
    checkedAt: z.iso.date().nullable(),
    reason: nonEmptyText,
  }).strict(),
  segments: z.array(segmentSchema),
  practiceSteps: z.array(
    z.object({ title: nonEmptyText, instruction: nonEmptyText }).strict(),
  ),
  copyBlocks: z.array(z.object({
    kind: z.enum(["prompt", "code"]),
    title: nonEmptyText,
    language: nonEmptyText,
    content: nonEmptyText,
  }).strict()),
  concepts: z.array(
    z.object({ term: nonEmptyText, description: nonEmptyText }).strict(),
  ),
  warnings: z.array(nonEmptyText),
  sources: z.array(z.object({
    type: z.enum(["official", "original", "related"]),
    title: nonEmptyText,
    url: httpsUrl,
  }).strict()),
  todo: z.array(nonEmptyText),
}).strict().superRefine((content, context) => {
  const addIssue = (path: PropertyKey[], message: string) => {
    context.addIssue({ code: "custom", path, message });
  };

  const requiredCount = content.segments.filter(
    (segment) => segment.type === "required",
  ).length;
  const optionalCount = content.segments.filter(
    (segment) => segment.type === "optional",
  ).length;

  if (requiredCount > 5) {
    addIssue(["segments"], "필수 구간은 최대 5개입니다.");
  }
  if (optionalCount > 3) {
    addIssue(["segments"], "선택 구간은 최대 3개입니다.");
  }
  if (content.segments.length > 0 && content.video.durationSeconds === null) {
    addIssue(
      ["video", "durationSeconds"],
      "영상 구간을 등록하려면 영상 길이를 먼저 확인해야 합니다.",
    );
  }

  const sortedSegments = content.segments
    .map((segment, index) => ({ segment, index }))
    .sort((left, right) => left.segment.startSeconds - right.segment.startSeconds);

  sortedSegments.forEach(({ segment, index }, sortedIndex) => {
    if (segment.startSeconds >= segment.endSeconds) {
      addIssue(
        ["segments", index, "endSeconds"],
        "구간 종료는 시작보다 늦어야 합니다.",
      );
    }
    if (
      content.video.durationSeconds !== null &&
      segment.endSeconds > content.video.durationSeconds
    ) {
      addIssue(
        ["segments", index, "endSeconds"],
        "구간이 영상 길이를 초과합니다.",
      );
    }

    const previous = sortedSegments[sortedIndex - 1];
    if (previous && previous.segment.endSeconds > segment.startSeconds) {
      addIssue(
        ["segments", index, "startSeconds"],
        "영상 구간은 서로 겹칠 수 없습니다.",
      );
    }
  });

  if (content.verificationStatus === "reviewed") {
    const requiredVideoFields = [
      "youtubeId",
      "title",
      "channel",
      "publishedAt",
      "durationSeconds",
      "language",
      "originalUrl",
    ] as const;

    requiredVideoFields.forEach((field) => {
      if (content.video[field] === null) {
        addIssue(
          ["video", field],
          "검수 완료 콘텐츠에는 확인된 영상 정보가 필요합니다.",
        );
      }
    });
    if (content.freshness.status === "unverified") {
      addIssue(
        ["freshness", "status"],
        "검수 완료 콘텐츠의 최신성은 확인되어야 합니다.",
      );
    }
    if (content.freshness.checkedAt === null) {
      addIssue(
        ["freshness", "checkedAt"],
        "검수 완료 콘텐츠에는 최신성 확인일이 필요합니다.",
      );
    }
    if (content.todo.length > 0) {
      addIssue(
        ["todo"],
        "검수 완료 콘텐츠에는 미확인 TODO를 남길 수 없습니다.",
      );
    }
  }
});

export type VideoContent = z.infer<typeof videoContentSchema>;

export const videoContentJsonSchema = z.toJSONSchema(videoContentSchema, {
  target: "draft-2020-12",
});

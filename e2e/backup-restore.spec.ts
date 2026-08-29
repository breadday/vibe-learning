import { expect, test } from "@playwright/test";

const currentVideo = video(
  "AAAAAAAAAAA",
  "현재 제목",
  "2026-08-28T00:00:00.000Z",
);
const updatedVideo = video(
  "AAAAAAAAAAA",
  "병합된 최신 제목",
  "2026-08-29T00:00:00.000Z",
);
const mergedVideo = video(
  "BBBBBBBBBBB",
  "병합으로 추가한 영상",
  "2026-08-29T01:00:00.000Z",
);
const overwriteVideo = video(
  "CCCCCCCCCCC",
  "덮어쓰기로 복원한 영상",
  "2026-08-29T02:00:00.000Z",
);

test("previews, merges, and overwrites valid JSON backups", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(
    ({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)),
    {
      key: "vibe-learning:v1",
      value: store([currentVideo], currentVideo.youtubeId),
    },
  );
  await page.reload();

  await uploadBackup(page, store([updatedVideo, mergedVideo], mergedVideo.youtubeId));
  await expect(page.getByText("영상 2개 · 현재 목록과 중복 1개")).toBeVisible();
  await page.getByRole("button", { name: "병합" }).click();
  await expect(page.getByText("백업을 현재 학습 목록과 병합했습니다.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "병합된 최신 제목" }).first())
    .toBeVisible();
  await expect(page.getByRole("heading", { name: "병합으로 추가한 영상" }).first())
    .toBeVisible();

  await uploadBackup(page, store([overwriteVideo], overwriteVideo.youtubeId));
  await expect(page.getByText("영상 1개 · 현재 목록과 중복 0개")).toBeVisible();
  await page.getByRole("button", { name: "덮어쓰기" }).click();
  await expect(page.getByText("현재 학습 목록을 백업 데이터로 교체했습니다."))
    .toBeVisible();
  await expect(page.getByRole("heading", { name: "덮어쓰기로 복원한 영상" }).first())
    .toBeVisible();
  await expect(page.getByRole("heading", { name: "병합된 최신 제목" }))
    .toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("heading", { name: "덮어쓰기로 복원한 영상" }).first())
    .toBeVisible();
});

function video(youtubeId: string, title: string, updatedAt: string) {
  return {
    youtubeId,
    title,
    normalizedUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
    status: "not-started",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt,
  };
}

function store(videos: ReturnType<typeof video>[], lastOpenedVideoId: string) {
  return { schemaVersion: 1, videos, lastOpenedVideoId };
}

async function uploadBackup(
  page: import("@playwright/test").Page,
  backup: ReturnType<typeof store>,
) {
  await page.getByLabel("JSON 가져오기").setInputFiles({
    name: "vibe-learning-backup-2026-08-29.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
}

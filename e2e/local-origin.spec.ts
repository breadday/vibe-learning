import { expect, test } from "@playwright/test";

const storedVideo = {
  youtubeId: "AAAAAAAAAAA",
  title: "이전에 저장한 영상",
  normalizedUrl: "https://www.youtube.com/watch?v=AAAAAAAAAAA",
  status: "in-progress",
  playbackMode: "embedded",
  playbackSeconds: 0,
  notes: [],
  segments: [],
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

test("shows previous data on the canonical localhost origin", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(
    ({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)),
    {
      key: "vibe-learning:v1",
      value: {
        schemaVersion: 1,
        videos: [storedVideo],
        lastOpenedVideoId: storedVideo.youtubeId,
      },
    },
  );

  await page.reload();
  await expect(page.getByText(storedVideo.title).first()).toBeVisible();
});

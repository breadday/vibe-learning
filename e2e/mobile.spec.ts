import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 360, height: 800 } });

test("has no horizontal overflow at 360px on home and detail pages", async ({
  page,
}, testInfo) => {
  const youtubeId = "CCCCCCCCCCC";
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)),
    {
      key: "vibe-learning:v1",
      value: {
        schemaVersion: 1,
        videos: [
          {
            youtubeId,
            title: "360px 모바일 검사 영상",
            normalizedUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
            status: "not-started",
            createdAt: "2026-08-29T00:00:00.000Z",
            updatedAt: "2026-08-29T00:00:00.000Z",
          },
        ],
        lastOpenedVideoId: youtubeId,
      },
    },
  );

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "360px 모바일 검사 영상" }).first())
    .toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("mobile-home.png"), fullPage: true });

  await page.getByRole("link", { name: "학습 열기" }).first().click();
  await expect(page).toHaveURL(`/videos/${youtubeId}`);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("mobile-detail.png"), fullPage: true });
});

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
}

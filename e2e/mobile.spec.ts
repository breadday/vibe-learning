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
            playbackMode: "embedded",
            playbackSeconds: 0,
            notes: [],
            segments: [],
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
  await page.getByLabel("메모 내용").fill("가로로 아주 긴 문자열도 화면을 밀어내지 않는지 확인하는 360px 개인 메모");
  await page.getByRole("button", { name: "메모 저장" }).click();
  await expect(page.getByText(/가로로 아주 긴 문자열/)).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "YouTube에서 학습하기" }).click();
  await expect(page.getByRole("link", { name: "YouTube에서 보기" })).toBeVisible();
  await page.getByLabel("마지막 학습 위치").fill("12:43");
  await expect(page.getByRole("button", { name: "위치 저장" })).toBeVisible();
  await expect(page.getByRole("button", { name: "앱에서 재생 시도" })).toBeVisible();
  await page.getByLabel("구간 제목").fill(
    "공백 없이도아주길게이어지는학습구간제목이모바일화면을밀어내지않는지확인",
  );
  await page.getByLabel("구간 시작 시간").fill("12:43");
  await page.getByLabel("구간 종료 시간").fill("13:20");
  await page.getByRole("button", { name: "구간 추가" }).click();
  const [segmentsBox, notesBox] = await Promise.all([
    page.getByRole("region", { name: "학습 구간" }).boundingBox(),
    page.getByRole("region", { name: "개인 메모" }).boundingBox(),
  ]);
  expect(segmentsBox).not.toBeNull();
  expect(notesBox).not.toBeNull();
  expect(segmentsBox?.y ?? 0).toBeLessThan(notesBox?.y ?? 0);
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

import { expect, test } from "@playwright/test";

const videoId = "TITLETEST01";
const automaticTitle = "API가 가져온 학습 제목";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/youtube-title?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ title: automaticTitle }),
    });
  });
});

test("registers a video with the automatic title", async ({ page }) => {
  await page.goto("/");
  await page
    .getByLabel("YouTube 주소를 붙여 넣으세요")
    .fill(`https://youtu.be/${videoId}`);

  await expect(page.getByLabel("학습 제목")).toHaveValue(automaticTitle);
  await page.getByRole("button", { name: "학습에 추가" }).click();

  await expect(page).toHaveURL(`/videos/${videoId}`);
  await expect(page.getByRole("heading", { name: automaticTitle })).toBeVisible();
});

test("persists an edited automatic title on detail, list, and reload", async ({
  page,
}) => {
  const editedTitle = "내가 다듬은 자동 제목";
  await page.goto("/");
  await page
    .getByLabel("YouTube 주소를 붙여 넣으세요")
    .fill(`https://www.youtube.com/watch?v=${videoId}`);
  await expect(page.getByLabel("학습 제목")).toHaveValue(automaticTitle);
  await page.getByLabel("학습 제목").fill(editedTitle);
  await page.getByRole("button", { name: "학습에 추가" }).click();

  await expect(page).toHaveURL(`/videos/${videoId}`);
  await expect(page.getByRole("heading", { name: editedTitle })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: editedTitle })).toBeVisible();
  await page.getByRole("link", { name: "다른 영상 추가" }).click();
  await expect(page.getByRole("heading", { name: editedTitle }).first()).toBeVisible();
});

test("falls back to a manual title when lookup fails", async ({ page }) => {
  await page.unroute("**/api/youtube-title?**");
  await page.route("**/api/youtube-title?**", async (route) => {
    await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
  });
  await page.goto("/");
  await page
    .getByLabel("YouTube 주소를 붙여 넣으세요")
    .fill(`https://youtu.be/${videoId}`);

  await expect(
    page.getByText("제목을 자동으로 가져오지 못했습니다. 직접 입력해 주세요."),
  ).toBeVisible();
  await page.getByLabel("학습 제목").fill("수동 폴백 제목");
  await page.getByRole("button", { name: "학습에 추가" }).click();

  await expect(page).toHaveURL(`/videos/${videoId}`);
  await expect(page.getByRole("heading", { name: "수동 폴백 제목" })).toBeVisible();
});

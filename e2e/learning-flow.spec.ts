import { expect, test } from "@playwright/test";

const videoId = "ABCDEFGHIJK";
const title = "Playwright 학습 영상";

test("registers a YouTube URL, persists status, and deletes the video", async ({
  page,
}) => {
  await page.goto("/");

  await page
    .getByLabel("YouTube 주소를 붙여 넣으세요")
    .fill(`https://youtu.be/${videoId}`);
  await expect(page.getByText(videoId, { exact: true })).toBeVisible();
  await page.getByLabel("학습 제목").fill(title);
  await page.getByRole("button", { name: "학습에 추가" }).click();

  await expect(page).toHaveURL(`/videos/${videoId}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(`/videos/${videoId}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByLabel("학습 상태")).toHaveValue("not-started");

  await page.getByLabel("학습 상태").selectOption("in-progress");
  await expect(page.getByLabel("학습 상태")).toHaveValue("in-progress");

  await page.getByRole("link", { name: "다른 영상 추가" }).click();
  await expect(page).toHaveURL("/");
  const fullList = page
    .getByRole("heading", { name: "최근 수정한 순서로 보기" })
    .locator("..")
    .locator("..");
  const card = fullList.getByRole("article").filter({ hasText: title });
  await expect(card.getByText("학습 중")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "삭제" }).click();
  await expect(page.getByRole("heading", { name: "아직 등록한 영상이 없습니다." }))
    .toBeVisible();
});

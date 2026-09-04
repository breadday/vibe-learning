import { expect, test } from "@playwright/test";

test("opens reviewed learning content from the home page", async ({ page }) => {
  await page.goto("/");
  const recommendedLink = page.getByRole("link", { name: "학습 시작" }).first();
  await expect(recommendedLink).toBeVisible();
  await recommendedLink.click();
  await expect(page).toHaveURL(/\/learn\/first-video$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("챗GPT");
  await expect(page.getByRole("heading", { name: "이 영상을 볼 가치" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "핵심 요약" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "필요한 구간만 바로 보기" })).toBeVisible();
});

test("renders the second reviewed video with its own copy", async ({ page }) => {
  await page.goto("/learn/second-video");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("커서");
  await expect(page.getByRole("button", { name: "설치 구간부터 보기" })).toBeVisible();
  await expect(page.getByRole("link", { name: "핵심 4줄 먼저 읽기" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "이 영상을 볼 가치" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "챕터 중 필요한 흐름만 고르기" })).toBeVisible();
  await expect(page.getByText("구간 재생 →").first()).toBeVisible();
  await expect(page.getByText("검수된 자료만으로 학습하고 결과는 내 브라우저에만 저장합니다.")).toBeVisible();
});

test("shows not found for an unknown slug", async ({ page }) => {
  const response = await page.goto("/learn/unknown-video");
  expect(response?.status()).toBe(404);
});

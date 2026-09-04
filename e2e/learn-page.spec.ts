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

test("shows not found for an unknown slug", async ({ page }) => {
  const response = await page.goto("/learn/unknown-video");
  expect(response?.status()).toBe(404);
});

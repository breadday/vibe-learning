import { expect, test } from "@playwright/test";

const videoId = "NOTESABCDE1";

test("adds, persists, edits, and deletes a personal note", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("YouTube 주소를 붙여 넣으세요")
    .fill(`https://youtu.be/${videoId}`);
  await page.getByLabel("학습 제목").fill("개인 메모 E2E 영상");
  await page.getByRole("button", { name: "학습에 추가" }).click();

  await page.getByLabel("메모 내용").fill("  새로고침할 메모  ");
  await page.getByRole("button", { name: "메모 추가" }).click();
  await expect(page.getByText("새로고침할 메모")).toBeVisible();
  await expect(page.getByText("1/500")).toBeVisible();

  await page.reload();
  await expect(page.getByText("새로고침할 메모")).toBeVisible();
  await page.getByRole("button", { name: "수정" }).click();
  await page.getByLabel("메모 수정 내용").fill("수정 후 유지되는 메모");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("수정 후 유지되는 메모")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "삭제" }).click();
  await expect(page.getByText("아직 작성한 개인 메모가 없습니다.")).toBeVisible();
  await expect(page.getByText("0/500")).toBeVisible();
});

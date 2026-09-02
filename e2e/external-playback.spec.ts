import { expect, test } from "@playwright/test";

const videoId = "EXTERNAL123";

test("learns with a manually saved position in external playback mode", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("YouTube 주소를 붙여 넣으세요")
    .fill(`https://youtu.be/${videoId}`);
  await page.getByLabel("학습 제목").fill("외부 재생 학습 영상");
  await page.getByRole("button", { name: "학습에 추가" }).click();

  await expect(page.getByTitle("외부 재생 학습 영상 영상 플레이어")).toBeVisible();
  await page.getByRole("button", { name: "YouTube에서 학습하기" }).click();
  await expect(page.getByTitle("외부 재생 학습 영상 영상 플레이어")).toHaveCount(0);
  await expect(page.getByLabel("외부 재생 도구")).toBeVisible();
  await expect(page.locator(".detail-player-column")).toHaveCount(0);
  await expect(page.locator(".saved-player")).toHaveCount(0);

  const segmentsRegion = page.getByRole("region", { name: "학습 구간" });
  const notesRegion = page.getByRole("region", { name: "개인 메모" });
  const [segmentsBox, notesBox] = await Promise.all([
    segmentsRegion.boundingBox(),
    notesRegion.boundingBox(),
  ]);
  expect(segmentsBox).not.toBeNull();
  expect(notesBox).not.toBeNull();
  expect(Math.abs((segmentsBox?.y ?? 0) - (notesBox?.y ?? 0))).toBeLessThanOrEqual(2);
  expect(segmentsBox?.x ?? 0).toBeLessThan(notesBox?.x ?? 0);

  await page.getByLabel("마지막 학습 위치").fill("12:43");
  await page.getByRole("button", { name: "위치 저장" }).click();
  await expect(page.getByRole("link", { name: "YouTube에서 보기" }))
    .toHaveAttribute("href", `https://www.youtube.com/watch?v=${videoId}&t=763s`);

  await page.getByLabel("구간 제목").fill("외부 핵심 구간");
  await page.getByLabel("구간 시작 시간").fill("12:43");
  await page.getByLabel("구간 종료 시간").fill("13:20");
  await page.getByRole("button", { name: "구간 추가" }).click();
  await expect(page.getByRole("link", { name: "YouTube에서 시작" }))
    .toHaveAttribute("href", `https://www.youtube.com/watch?v=${videoId}&t=763s`);
  await page.getByRole("region", { name: "학습 구간" }).getByRole("button", { name: "수정" }).click();
  await page.getByLabel("구간 제목").fill("수정한 외부 구간");
  await page.getByRole("button", { name: "구간 수정 저장" }).click();
  await expect(page.getByText("수정한 외부 구간")).toBeVisible();

  await page.getByLabel("메모 내용").fill("외부 위치에 저장한 메모");
  await page.getByRole("button", { name: "메모 저장" }).click();
  await expect(page.getByRole("button", { name: "[12:43] 위치로 이동" })).toBeVisible();

  await page.getByRole("region", { name: "개인 메모" }).getByRole("button", { name: "수정" }).click();
  await page.getByLabel("메모 수정 내용").fill("수정한 외부 재생 메모");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("수정한 외부 재생 메모")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("외부 재생 도구")).toBeVisible();
  await expect(page.getByText("수정한 외부 구간")).toBeVisible();
  await expect(page.getByText("수정한 외부 재생 메모")).toBeVisible();
  await expect(page.getByRole("link", { name: "YouTube에서 보기" }))
    .toHaveAttribute("href", `https://www.youtube.com/watch?v=${videoId}&t=763s`);

  const stored = await page.evaluate(() => JSON.parse(
    window.localStorage.getItem("vibe-learning:v1") ?? "null",
  ));
  expect(stored.videos[0]).toMatchObject({
    playbackMode: "external",
    playbackSeconds: 763,
  });
  expect(stored.videos[0].notes[0].timestampSeconds).toBe(763);
  expect(stored.lastOpenedVideoId).toBe(videoId);

  await page.getByRole("button", { name: "앱에서 재생 시도" }).click();
  await expect(page.getByTitle("외부 재생 학습 영상 영상 플레이어")).toBeVisible();
  await expect(page.getByText("수정한 외부 구간")).toBeVisible();
  await expect(page.getByText("수정한 외부 재생 메모")).toBeVisible();
  await page.getByRole("button", { name: "YouTube에서 학습하기" }).click();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("region", { name: "개인 메모" }).getByRole("button", { name: "삭제" }).click();
  await expect(page.getByText("아직 작성한 개인 메모가 없습니다.")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("region", { name: "학습 구간" }).getByRole("button", { name: "삭제" }).click();
  await expect(page.getByText("아직 저장한 학습 구간이 없습니다.")).toBeVisible();
});

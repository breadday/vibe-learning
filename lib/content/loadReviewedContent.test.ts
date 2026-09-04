import { describe, expect, it } from "vitest";
import { listReviewedContent, loadReviewedContent } from "./loadReviewedContent";

describe("loadReviewedContent", () => {
  it("returns reviewed content with the mdx body for a known slug", async () => {
    const content = await loadReviewedContent("first-video");
    expect(content).not.toBeNull();
    expect(content?.verificationStatus).toBe("reviewed");
    expect(content?.video.youtubeId).toBe("dKQQs-z_E64");
    expect(content?.mdxContent).toContain("이 영상을 볼 가치");
    expect(content?.mdxContent).toContain("핵심 요약");
  });

  it("returns null for an unknown slug", async () => {
    await expect(loadReviewedContent("unknown-video")).resolves.toBeNull();
  });

  it("returns null for a slug that escapes the content directory", async () => {
    await expect(loadReviewedContent("../package")).resolves.toBeNull();
  });
});

describe("listReviewedContent", () => {
  it("lists only reviewed content from the content directory", async () => {
    const contents = await listReviewedContent();
    expect(contents.map((content) => content.slug)).toContain("first-video");
    expect(
      contents.every((content) => content.verificationStatus === "reviewed"),
    ).toBe(true);
  });
});

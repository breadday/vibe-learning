import { describe, expect, it } from "vitest";
import { parseYouTubeUrl } from "./parseYouTubeUrl";

const videoId = "ABCDEFGHIJK";
const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;

describe("parseYouTubeUrl", () => {
  it.each([
    `https://www.youtube.com/watch?v=${videoId}`,
    `https://youtube.com/watch?v=${videoId}`,
    `https://m.youtube.com/watch?v=${videoId}`,
    `https://youtu.be/${videoId}`,
    `https://www.youtube.com/shorts/${videoId}`,
    `https://www.youtube.com/embed/${videoId}`,
  ])("normalizes a supported URL: %s", (input) => {
    expect(parseYouTubeUrl(input)).toBe(standardUrl);
  });

  it("trims surrounding whitespace", () => {
    expect(parseYouTubeUrl(`  \n${standardUrl}\t `)).toBe(standardUrl);
  });

  it.each([
    `https://youtube.com.evil.com/watch?v=${videoId}`,
    `https://fake-youtube.com/watch?v=${videoId}`,
    `https://youtu.be/${videoId}/extra`,
  ])("rejects a deceptive or unsupported location: %s", (input) => {
    expect(parseYouTubeUrl(input)).toBeNull();
  });

  it.each([
    "https://www.youtube.com/watch",
    "https://www.youtube.com/watch?v=ABCDEFGHIJ",
    "https://youtu.be/ABCDEFGHIJ",
    "https://www.youtube.com/shorts/ABCDEFGHIJKL",
    "https://www.youtube.com/embed/invalid.id!",
  ])("rejects a missing or invalid video ID: %s", (input) => {
    expect(parseYouTubeUrl(input)).toBeNull();
  });

  it.each([
    "not a URL",
    `http://www.youtube.com/watch?v=${videoId}`,
    `https://www.youtube.com/live/${videoId}`,
  ])("rejects an invalid or unsupported URL: %s", (input) => {
    expect(parseYouTubeUrl(input)).toBeNull();
  });
});

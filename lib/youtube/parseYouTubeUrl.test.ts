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
    expect(parseYouTubeUrl(input)).toEqual({
      ok: true,
      videoId,
      normalizedUrl: standardUrl,
    });
  });

  it("trims surrounding whitespace", () => {
    expect(parseYouTubeUrl(`  \n${standardUrl}\t `)).toEqual({
      ok: true,
      videoId,
      normalizedUrl: standardUrl,
    });
  });

  it("accepts additional query parameters", () => {
    expect(
      parseYouTubeUrl(
        `https://www.youtube.com/watch?feature=shared&v=${videoId}&t=30`,
      ),
    ).toEqual({ ok: true, videoId, normalizedUrl: standardUrl });
  });

  it.each([
    [
      `https://youtube.com.evil.com/watch?v=${videoId}`,
      "unsupported-host",
    ],
    [`https://fake-youtube.com/watch?v=${videoId}`, "unsupported-host"],
    [`https://youtu.be/${videoId}/extra`, "invalid-video-id"],
  ] as const)(
    "rejects a deceptive or unsupported location: %s",
    (input, reason) => {
      expect(parseYouTubeUrl(input)).toEqual({ ok: false, reason });
    },
  );

  it.each([
    "https://www.youtube.com/watch",
    "https://www.youtube.com/watch?v=ABCDEFGHIJ",
    "https://youtu.be/ABCDEFGHIJ",
    "https://www.youtube.com/shorts/ABCDEFGHIJKL",
    "https://www.youtube.com/embed/invalid.id!",
  ])("rejects a missing or invalid video ID: %s", (input) => {
    expect(parseYouTubeUrl(input)).toEqual({
      ok: false,
      reason: "invalid-video-id",
    });
  });

  it.each([
    ["not a URL", "invalid-url"],
    ["   ", "invalid-url"],
    [`http://www.youtube.com/watch?v=${videoId}`, "invalid-url"],
    [`https://www.youtube.com/live/${videoId}`, "invalid-video-id"],
  ] as const)("returns a specific failure reason: %s", (input, reason) => {
    expect(parseYouTubeUrl(input)).toEqual({ ok: false, reason });
  });
});

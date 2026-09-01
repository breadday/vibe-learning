import { describe, expect, it } from "vitest";
import {
  createYouTubeWatchUrl,
  formatTimeInput,
  parseTimeInput,
} from "./youtubePlayback";

describe("youtubePlayback", () => {
  it("creates normal and timestamped YouTube watch URLs", () => {
    expect(createYouTubeWatchUrl("ABCDEFGHIJK"))
      .toBe("https://www.youtube.com/watch?v=ABCDEFGHIJK");
    expect(createYouTubeWatchUrl("ABCDEFGHIJK", 763))
      .toBe("https://www.youtube.com/watch?v=ABCDEFGHIJK&t=763s");
  });

  it.each([
    ["12:43", 763],
    ["1:02:03", 3_723],
    ["0:00", 0],
  ])("parses %s", (input, seconds) => {
    expect(parseTimeInput(input)).toBe(seconds);
    expect(formatTimeInput(seconds as number)).toBe(input);
  });

  it.each(["", "12", "-1:20", "1:60", "1:60:00", "abc:10", "1:2:3:4"])(
    "rejects invalid time input %s",
    (input) => expect(parseTimeInput(input)).toBeNull(),
  );
});

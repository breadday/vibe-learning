import { describe, expect, it } from "vitest";
import { getCanonicalLocalUrl } from "./canonicalLocalOrigin";

describe("getCanonicalLocalUrl", () => {
  it("keeps the port, path, query, and hash when normalizing 127.0.0.1", () => {
    expect(
      getCanonicalLocalUrl(
        new URL("http://127.0.0.1:3000/videos/ABCDEFGHIJK?mode=study#notes"),
      ),
    ).toBe("http://localhost:3000/videos/ABCDEFGHIJK?mode=study#notes");
  });

  it("uses the request host when the framework-normalized URL differs", () => {
    expect(
      getCanonicalLocalUrl(
        new URL("http://0.0.0.0:3100/?mode=study"),
        "127.0.0.1:3100",
      ),
    ).toBe("http://localhost:3100/?mode=study");
  });

  it.each([
    "http://localhost:3000/",
    "https://vibe-learning.example/",
  ])("does not change %s", (url) => {
    expect(getCanonicalLocalUrl(new URL(url))).toBeNull();
  });
});

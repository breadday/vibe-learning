import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const apiKey = "test-api-key";
const videoId = "ABCDEFGHIJK";

function createRequest(value: string | null) {
  const url = new URL("http://localhost/api/youtube-title");
  if (value !== null) {
    url.searchParams.set("videoId", value);
  }
  return new Request(url);
}

beforeEach(() => {
  vi.stubEnv("YOUTUBE_API_KEY", apiKey);
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/youtube-title", () => {
  it("returns only the title and uses the fixed YouTube videos.list request", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [{ snippet: { title: "공식 영상 제목", description: "secret" } }],
          pageInfo: { totalResults: 1 },
        }),
        { status: 200 },
      ),
    );

    const response = await GET(createRequest(videoId));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ title: "공식 영상 제목" });
    expect(fetch).toHaveBeenCalledOnce();
    const [requestUrl, options] = vi.mocked(fetch).mock.calls[0];
    const url = new URL(String(requestUrl));
    expect(url.origin + url.pathname).toBe(
      "https://www.googleapis.com/youtube/v3/videos",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      part: "snippet",
      id: videoId,
      key: apiKey,
      fields: "items(snippet(title))",
    });
    expect(options).toMatchObject({ cache: "no-store" });
  });

  it.each([null, "", "short", "ABCDEFGHIJ!"])(
    "rejects an invalid video ID without an external request: %s",
    async (invalidId) => {
      const response = await GET(createRequest(invalidId));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid-video-id" });
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("returns 503 without an external request when the API key is missing", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "");

    const response = await GET(createRequest(videoId));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "service-unavailable" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns 404 when YouTube has no usable video", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), { status: 200 }),
    );

    const response = await GET(createRequest(videoId));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "video-not-found" });
  });

  it.each([
    new Response("quota details", { status: 403 }),
    new Response("not-json", { status: 200 }),
    new Response(JSON.stringify({ items: [{ snippet: { title: "" } }] }), {
      status: 200,
    }),
    new Response(
      JSON.stringify({ items: [{ snippet: { title: "가".repeat(101) } }] }),
      { status: 200 },
    ),
  ])("returns a safe 502 for an upstream failure", async (upstreamResponse) => {
    vi.mocked(fetch).mockResolvedValue(upstreamResponse);

    const response = await GET(createRequest(videoId));
    const body = JSON.stringify(await response.json());

    expect(response.status).toBe(502);
    expect(body).toBe(JSON.stringify({ error: "upstream-error" }));
    expect(body).not.toContain(apiKey);
    expect(body).not.toContain("quota details");
  });

  it("returns a safe 502 for a network failure", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error(`failed with ${apiKey}`));

    const response = await GET(createRequest(videoId));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "upstream-error" });
  });
});

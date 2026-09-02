const youtubeVideosEndpoint = "https://www.googleapis.com/youtube/v3/videos";
const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;

function errorResponse(
  error: "invalid-video-id" | "video-not-found" | "upstream-error" | "service-unavailable",
  status: 400 | 404 | 502 | 503,
) {
  return Response.json({ error }, { status });
}

export async function GET(request: Request) {
  const videoId = new URL(request.url).searchParams.get("videoId") ?? "";

  if (!videoIdPattern.test(videoId)) {
    return errorResponse("invalid-video-id", 400);
  }

  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    return errorResponse("service-unavailable", 503);
  }

  const url = new URL(youtubeVideosEndpoint);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("id", videoId);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("fields", "items(snippet(title))");

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return errorResponse("upstream-error", 502);
    }

    const payload: unknown = await response.json();
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("items" in payload) ||
      !Array.isArray(payload.items)
    ) {
      return errorResponse("upstream-error", 502);
    }

    if (payload.items.length === 0) {
      return errorResponse("video-not-found", 404);
    }

    const firstItem: unknown = payload.items[0];
    const title =
      typeof firstItem === "object" &&
      firstItem !== null &&
      "snippet" in firstItem &&
      typeof firstItem.snippet === "object" &&
      firstItem.snippet !== null &&
      "title" in firstItem.snippet &&
      typeof firstItem.snippet.title === "string"
        ? firstItem.snippet.title.trim()
        : "";

    if (title.length === 0 || [...title].length > 100) {
      return errorResponse("upstream-error", 502);
    }

    return Response.json({ title });
  } catch {
    return errorResponse("upstream-error", 502);
  }
}

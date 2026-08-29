const allowedHosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;

export type ParseYouTubeUrlResult =
  | { ok: true; videoId: string; normalizedUrl: string }
  | {
    ok: false;
    reason: "invalid-url" | "unsupported-host" | "invalid-video-id";
  };

export function parseYouTubeUrl(input: string): ParseYouTubeUrlResult {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, reason: "invalid-url" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, reason: "invalid-url" };
  }

  if (!allowedHosts.has(url.hostname)) {
    return { ok: false, reason: "unsupported-host" };
  }

  let videoId: string | null = null;

  if (url.hostname === "youtu.be") {
    const match = url.pathname.match(/^\/([^/]+)$/);
    videoId = match?.[1] ?? null;
  } else if (url.pathname === "/watch") {
    videoId = url.searchParams.get("v");
  } else {
    const match = url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)$/);
    videoId = match?.[1] ?? null;
  }

  if (videoId === null || !videoIdPattern.test(videoId)) {
    return { ok: false, reason: "invalid-video-id" };
  }

  return {
    ok: true,
    videoId,
    normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

const allowedHosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeUrl(input: string): string | null {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname)) {
    return null;
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
    return null;
  }

  return `https://www.youtube.com/watch?v=${videoId}`;
}

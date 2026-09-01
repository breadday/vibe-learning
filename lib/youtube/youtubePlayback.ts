export function createYouTubeWatchUrl(
  youtubeId: string,
  timestampSeconds = 0,
): string {
  const url = new URL("https://www.youtube.com/watch");
  url.searchParams.set("v", youtubeId);

  const seconds = Math.max(0, Math.floor(timestampSeconds));
  if (seconds > 0) url.searchParams.set("t", `${seconds}s`);

  return url.toString();
}

export function parseTimeInput(value: string): number | null {
  const parts = value.trim().split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) {
    return null;
  }

  const numbers = parts.map(Number);
  const [hours, minutes, seconds] = parts.length === 3
    ? numbers
    : [0, numbers[0], numbers[1]];

  if (minutes < 0 || seconds < 0 || seconds >= 60 || (parts.length === 3 && minutes >= 60)) {
    return null;
  }

  return hours * 3_600 + minutes * 60 + seconds;
}

export function formatTimeInput(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = String(seconds % 60).padStart(2, "0");

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${remainder}`
    : `${minutes}:${remainder}`;
}

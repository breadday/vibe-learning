export function getCanonicalLocalUrl(
  currentUrl: URL,
  requestHost = currentUrl.host,
): string | null {
  const loopbackHost = /^127\.0\.0\.1(?::(\d{1,5}))?$/.exec(requestHost);

  if (loopbackHost === null) {
    return null;
  }

  const canonicalUrl = new URL(currentUrl.href);
  canonicalUrl.hostname = "localhost";
  canonicalUrl.port = loopbackHost[1] ?? currentUrl.port;
  return canonicalUrl.href;
}

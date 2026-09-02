import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCanonicalLocalUrl } from "./lib/browser/canonicalLocalOrigin";

export function proxy(request: NextRequest) {
  const canonicalLocalUrl = getCanonicalLocalUrl(
    request.nextUrl,
    request.headers.get("host") ?? request.nextUrl.host,
  );

  if (canonicalLocalUrl !== null) {
    return new Response(null, {
      headers: { location: canonicalLocalUrl },
      status: 307,
    });
  }

  return NextResponse.next();
}

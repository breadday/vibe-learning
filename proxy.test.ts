import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

describe("proxy", () => {
  it("redirects 127.0.0.1 to the localhost origin", () => {
    const response = proxy(
      new NextRequest("http://127.0.0.1:3100/?mode=study", {
        headers: { host: "127.0.0.1:3100" },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3100/?mode=study",
    );
  });

  it("continues requests that already use localhost", () => {
    const response = proxy(new NextRequest("http://localhost:3100/"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});

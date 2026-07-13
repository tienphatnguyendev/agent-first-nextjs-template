import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "@/proxy";

describe("proxy", () => {
  it("propagates the correlation ID to the request and response", () => {
    const request = new NextRequest("http://localhost/example", {
      headers: { "x-correlation-id": "request-123" },
    });

    const response = proxy(request);

    expect(response.headers.get("x-middleware-request-x-correlation-id")).toBe(
      "request-123",
    );
    expect(response.headers.get("x-correlation-id")).toBe("request-123");
  });

  it("replaces an unsafe ID in both request and response headers", () => {
    const request = new NextRequest("http://localhost/example", {
      headers: { "x-correlation-id": "bad id" },
    });

    const response = proxy(request);
    const requestId = response.headers.get(
      "x-middleware-request-x-correlation-id",
    );
    const responseId = response.headers.get("x-correlation-id");

    expect(requestId).not.toBe("bad id");
    expect(requestId).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/);
    expect(responseId).toBe(requestId);
  });
});

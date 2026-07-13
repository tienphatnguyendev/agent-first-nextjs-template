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
});

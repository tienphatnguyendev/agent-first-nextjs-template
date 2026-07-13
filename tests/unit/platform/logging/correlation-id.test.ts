import { describe, expect, it, vi } from "vitest";

import {
  CORRELATION_ID_HEADER,
  getOrCreateCorrelationId,
} from "@/platform/logging/correlation-id";

describe("getOrCreateCorrelationId", () => {
  it("keeps a safe incoming correlation ID", () => {
    const createId = vi.fn(() => "generated-id");

    expect(getOrCreateCorrelationId("request-123", createId)).toBe(
      "request-123",
    );
    expect(createId).not.toHaveBeenCalled();
  });

  it.each([null, undefined, "", "bad id", "-invalid", "a".repeat(129)])(
    "generates an ID when the candidate is unsafe: %s",
    (candidate) => {
      const createId = vi.fn(() => "generated-id");

      expect(getOrCreateCorrelationId(candidate, createId)).toBe(
        "generated-id",
      );
      expect(createId).toHaveBeenCalledOnce();
    },
  );

  it("exports the standard correlation header name", () => {
    expect(CORRELATION_ID_HEADER).toBe("x-correlation-id");
  });
});

import { describe, expect, it } from "vitest";

import { AppError } from "@/platform/errors/app-error";

describe("AppError", () => {
  it("exposes a safe operational error contract", () => {
    const error = new AppError("NOT_FOUND", "Resource not found", 404);

    expect(error).toMatchObject({
      name: "AppError",
      message: "Resource not found",
      code: "NOT_FOUND",
      status: 404,
      isOperational: true,
    });
    expect(error).toBeInstanceOf(Error);
  });
});

import { describe, expect, it } from "vitest";

import {
  EnvironmentValidationError,
  parseServerEnv,
} from "@/platform/env/server";

const localUrl =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public";

describe("parseServerEnv", () => {
  it("accepts the complete server contract", () => {
    expect(
      parseServerEnv({
        NODE_ENV: "test",
        LOG_LEVEL: "info",
        DATABASE_URL: localUrl,
        DIRECT_URL: localUrl,
      }),
    ).toEqual({
      NODE_ENV: "test",
      LOG_LEVEL: "info",
      DATABASE_URL: localUrl,
      DIRECT_URL: localUrl,
    });
  });

  it("names invalid variables without exposing their values", () => {
    const secret = "postgresql://user:very-secret@example.com/app";

    expect(() =>
      parseServerEnv({ DATABASE_URL: secret, DIRECT_URL: "" }),
    ).toThrow(EnvironmentValidationError);

    try {
      parseServerEnv({ DATABASE_URL: secret, DIRECT_URL: "" });
    } catch (error) {
      expect(String(error)).toContain("DIRECT_URL");
      expect(String(error)).not.toContain("very-secret");
    }
  });
});

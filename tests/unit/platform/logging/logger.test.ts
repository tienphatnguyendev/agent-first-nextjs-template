import { describe, expect, it } from "vitest";

import { createLogger } from "@/platform/logging/logger";

describe("createLogger", () => {
  it("writes JSON and redacts secret fields and database URLs", () => {
    const secretUrl = "postgresql://user:secret@db.example.com/app";
    const chunks: string[] = [];
    const logger = createLogger(
      {
        LOG_LEVEL: "info",
        DATABASE_URL: secretUrl,
        DIRECT_URL: secretUrl,
      },
      { write: (chunk: string) => chunks.push(chunk) },
    );
    const error = new Error(`connection failed for ${secretUrl}`);
    error.stack = `Error: connection failed\n    at ${secretUrl}`;

    logger.error(
      {
        err: error,
        authorization: "Bearer token",
        cookie: "session=secret",
        password: "password-value",
        secret: "secret-value",
        token: "token-value",
        databaseUrl: secretUrl,
        directUrl: secretUrl,
        requestBody: { password: "body-password" },
        req: {
          headers: {
            authorization: "Bearer nested-token",
            cookie: "nested-session=secret",
          },
        },
      },
      "request failed",
    );

    const destinationOutput = chunks.join("");
    const entry = JSON.parse(destinationOutput) as Record<string, unknown>;

    expect(entry).toMatchObject({
      level: 50,
      msg: "request failed",
      authorization: "[Redacted]",
      cookie: "[Redacted]",
      password: "[Redacted]",
      secret: "[Redacted]",
      token: "[Redacted]",
      databaseUrl: "[Redacted]",
      directUrl: "[Redacted]",
      requestBody: "[Redacted]",
      req: {
        headers: {
          authorization: "[Redacted]",
          cookie: "[Redacted]",
        },
      },
    });
    expect(destinationOutput).toContain("[Redacted]");
    expect(destinationOutput).not.toContain("Bearer token");
    expect(destinationOutput).not.toContain("body-password");
    expect(destinationOutput).not.toContain(secretUrl);
  });
});

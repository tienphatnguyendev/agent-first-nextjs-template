import { describe, expect, it } from "vitest";

import { createLogger } from "@/platform/logging/logger";

const databaseUrl = "postgresql://user:database-secret@db.example.com/app";
const directUrl = "postgresql://user:direct-secret@db.example.com/app";

function createTestLogger() {
  const chunks: string[] = [];
  const logger = createLogger(
    {
      LOG_LEVEL: "info",
      DATABASE_URL: databaseUrl,
      DIRECT_URL: directUrl,
    },
    { write: (chunk: string) => chunks.push(chunk) },
  );

  return { chunks, logger };
}

function parseEntry(chunks: string[]): Record<string, unknown> {
  return JSON.parse(chunks.join("")) as Record<string, unknown>;
}

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

  it("redacts sensitive keys inside nested objects and arrays", () => {
    const { chunks, logger } = createTestLogger();

    logger.info(
      {
        context: {
          authorization: "Bearer nested-token",
          child: { password: "nested-password" },
          entries: [
            { token: "array-token" },
            { requestBody: { private: "array-body" } },
          ],
        },
      },
      "nested fields",
    );

    const output = chunks.join("");
    expect(parseEntry(chunks)).toMatchObject({
      context: {
        authorization: "[Redacted]",
        child: { password: "[Redacted]" },
        entries: [{ token: "[Redacted]" }, { requestBody: "[Redacted]" }],
      },
    });
    expect(output).not.toContain("nested-token");
    expect(output).not.toContain("nested-password");
    expect(output).not.toContain("array-token");
    expect(output).not.toContain("array-body");
  });

  it("redacts database URLs in messages, arbitrary fields, and errors", () => {
    const { chunks, logger } = createTestLogger();
    const failure = new Error(`direct failure at ${directUrl}`);
    failure.stack = `Error: direct failure\n    at ${databaseUrl}`;

    logger.error(
      {
        note: `database is ${databaseUrl}`,
        failures: [failure],
        otherError: new Error(`database failure at ${databaseUrl}`),
      },
      `request failed for ${directUrl}`,
    );

    const output = chunks.join("");
    expect(parseEntry(chunks)).toMatchObject({
      msg: "request failed for [Redacted]",
      note: "database is [Redacted]",
      failures: [
        {
          type: "Error",
          message: "direct failure at [Redacted]",
          stack: expect.stringContaining("at [Redacted]"),
        },
      ],
      otherError: {
        type: "Error",
        message: "database failure at [Redacted]",
      },
    });
    expect(output).not.toContain(databaseUrl);
    expect(output).not.toContain(directUrl);
  });

  it("sanitizes circular objects without mutating caller-owned data", () => {
    const { chunks, logger } = createTestLogger();
    const payload: {
      authorization: string;
      note: string;
      self?: unknown;
    } = {
      authorization: "Bearer caller-token",
      note: databaseUrl,
    };
    payload.self = payload;

    logger.info({ context: payload }, "circular data");

    const output = chunks.join("");
    expect(parseEntry(chunks)).toMatchObject({
      context: {
        authorization: "[Redacted]",
        note: "[Redacted]",
      },
    });
    expect(output).not.toContain("caller-token");
    expect(output).not.toContain(databaseUrl);
    expect(payload).toMatchObject({
      authorization: "Bearer caller-token",
      note: databaseUrl,
    });
    expect(payload.self).toBe(payload);
  });

  it("handles BigInt and undefined while sanitizing surrounding data", () => {
    const { chunks, logger } = createTestLogger();
    const payload = {
      largeCount: BigInt("9007199254740993"),
      optional: undefined,
      values: [undefined, directUrl],
    };

    expect(() => logger.info({ payload }, "unusual values")).not.toThrow();

    const output = chunks.join("");
    const entry = parseEntry(chunks);
    expect(entry).toMatchObject({
      payload: {
        values: [null, "[Redacted]"],
      },
    });
    expect(entry.payload).toHaveProperty("largeCount");
    expect(output).not.toContain(directUrl);
    expect(payload).toEqual({
      largeCount: BigInt("9007199254740993"),
      optional: undefined,
      values: [undefined, directUrl],
    });
  });
});

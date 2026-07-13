import { describe, expect, it, vi } from "vitest";

import { createLogger } from "@/platform/logging/logger";

const databaseUrl = "postgresql://user:database-secret@db.example.com/app";
const directUrl = "postgresql://user:direct-secret@db.example.com/app";
const childOptionsError =
  "Child logger options are disabled because they can bypass log redaction. " +
  "Call child(bindings) without options.";
const logLevels = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
const approvedLoggerKeys = [...logLevels, "child", "setBindings"].sort();

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
  const [entry] = parseEntries(chunks);
  if (!entry) throw new Error("Expected one log entry");
  return entry;
}

function parseEntries(chunks: string[]): Record<string, unknown>[] {
  return chunks
    .join("")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

type TestLogger = ReturnType<typeof createLogger>;

function childWithOptions(
  logger: TestLogger,
  bindings: Record<string, unknown>,
  options: unknown,
): TestLogger {
  return (
    logger.child as unknown as (
      bindings: Record<string, unknown>,
      options: unknown,
    ) => TestLogger
  )(bindings, options);
}

function expectSafeLoggerSurface(logger: unknown): void {
  expect(Object.getPrototypeOf(logger)).toBeNull();
  expect(Object.isFrozen(logger)).toBe(true);
  expect(Object.keys(logger as object).sort()).toEqual(approvedLoggerKeys);
  const ownKeys = Reflect.ownKeys(logger as object);
  expect(ownKeys.every((key) => typeof key === "string")).toBe(true);
  expect(
    ownKeys.filter((key): key is string => typeof key === "string").sort(),
  ).toEqual(approvedLoggerKeys);

  const runtime = logger as Record<string, unknown>;
  for (const unsafeKey of [
    "onChild",
    "on",
    "emit",
    "addListener",
    "listeners",
    "bindings",
    "flush",
    "isLevelEnabled",
    "level",
    "levels",
  ]) {
    expect(unsafeKey in runtime).toBe(false);
  }
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
    Object.defineProperty(failure, "stack", {
      configurable: true,
      value: `Error: direct failure\n    at ${databaseUrl}`,
      writable: true,
    });

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

  it("sanitizes a direct Symbol argument into valid JSON", () => {
    const { chunks, logger } = createTestLogger();

    logger.info(Symbol(databaseUrl));

    expect(parseEntries(chunks)).toEqual([
      expect.objectContaining({ msg: "[Symbol]" }),
    ]);
    const output = chunks.join("");
    expect(output).not.toContain("Symbol(");
    expect(output).not.toContain(databaseUrl);
  });

  it("sanitizes a formatted Symbol argument without preserving its description", () => {
    const { chunks, logger } = createTestLogger();

    logger.info("failed connection: %s", Symbol(databaseUrl));

    expect(parseEntries(chunks)).toEqual([
      expect.objectContaining({ msg: "failed connection: [Symbol]" }),
    ]);
    const output = chunks.join("");
    expect(output).not.toContain("Symbol(");
    expect(output).not.toContain(databaseUrl);
  });

  it("sanitizes Symbol values inside objects, arrays, and bindings", () => {
    const { chunks, logger } = createTestLogger();
    const child = logger.child({ marker: Symbol(databaseUrl) });

    child.info(
      {
        payload: {
          marker: Symbol(directUrl),
          markers: [Symbol(databaseUrl)],
        },
      },
      "nested symbols",
    );

    expect(parseEntries(chunks)).toEqual([
      expect.objectContaining({
        marker: "[Symbol]",
        payload: {
          marker: "[Symbol]",
          markers: ["[Symbol]"],
        },
      }),
    ]);
    const output = chunks.join("");
    expect(output).not.toContain("Symbol(");
    expect(output).not.toContain(databaseUrl);
    expect(output).not.toContain(directUrl);
  });

  it("sanitizes child bindings, child calls, and descendant bindings", () => {
    const { chunks, logger } = createTestLogger();
    const childBindings = {
      authorization: "Bearer child-token",
      context: {
        password: "child-password",
        database: databaseUrl,
      },
    };
    const child = logger.child(childBindings);
    child.setBindings({
      cookie: "child-session-cookie",
      directDatabase: directUrl,
    });

    child.info(
      {
        call: {
          token: "child-call-token",
          database: directUrl,
        },
      },
      `child call ${databaseUrl}`,
    );
    child
      .child({
        secret: "grandchild-secret",
        database: directUrl,
      })
      .warn({ password: "grandchild-password" }, "grandchild call");

    const output = chunks.join("");
    const [childEntry, grandchildEntry] = parseEntries(chunks);
    expect(childEntry).toMatchObject({
      authorization: "[Redacted]",
      context: {
        password: "[Redacted]",
        database: "[Redacted]",
      },
      cookie: "[Redacted]",
      directDatabase: "[Redacted]",
      call: {
        token: "[Redacted]",
        database: "[Redacted]",
      },
      msg: "child call [Redacted]",
    });
    expect(grandchildEntry).toMatchObject({
      authorization: "[Redacted]",
      context: {
        password: "[Redacted]",
        database: "[Redacted]",
      },
      cookie: "[Redacted]",
      directDatabase: "[Redacted]",
      secret: "[Redacted]",
      database: "[Redacted]",
      password: "[Redacted]",
    });
    expect(output).not.toContain("child-token");
    expect(output).not.toContain("child-password");
    expect(output).not.toContain("child-session-cookie");
    expect(output).not.toContain("grandchild-secret");
    expect(output).not.toContain(databaseUrl);
    expect(output).not.toContain(directUrl);
    expect(childBindings).toEqual({
      authorization: "Bearer child-token",
      context: {
        password: "child-password",
        database: databaseUrl,
      },
    });
  });

  it("replaces function values without invoking a custom toJSON", () => {
    const { chunks, logger } = createTestLogger();
    const callback = vi.fn(() => directUrl);
    const toJSON = vi.fn(() => ({
      authorization: "Bearer to-json-token",
      database: databaseUrl,
    }));
    const payload = {
      label: "safe",
      callback,
      toJSON,
    };

    logger.info({ payload }, "function values");

    const output = chunks.join("");
    expect(parseEntry(chunks)).toMatchObject({
      payload: {
        label: "safe",
        callback: "[Function]",
        toJSON: "[Function]",
      },
    });
    expect(callback).not.toHaveBeenCalled();
    expect(toJSON).not.toHaveBeenCalled();
    expect(output).not.toContain("to-json-token");
    expect(output).not.toContain(databaseUrl);
    expect(payload).toEqual({ label: "safe", callback, toJSON });
  });

  it("redacts sensitive object keys with deterministic collision names", () => {
    const { chunks, logger } = createTestLogger();
    const payload = {
      [databaseUrl]: "database-key",
      [directUrl]: "direct-key",
      "[Redacted]": "existing-key",
      [`source:${databaseUrl}`]: "prefixed-key",
    };

    logger.info({ payload }, "object keys");

    const output = chunks.join("");
    expect(parseEntry(chunks)).toMatchObject({
      payload: {
        "[Redacted]": "database-key",
        "[Redacted]#2": "direct-key",
        "[Redacted]#3": "existing-key",
        "source:[Redacted]": "prefixed-key",
      },
    });
    expect(output).not.toContain(databaseUrl);
    expect(output).not.toContain(directUrl);
    expect(payload).toEqual({
      [databaseUrl]: "database-key",
      [directUrl]: "direct-key",
      "[Redacted]": "existing-key",
      [`source:${databaseUrl}`]: "prefixed-key",
    });
  });

  it("rejects child message prefixes before they can reach Pino", () => {
    const { chunks, logger } = createTestLogger();

    expect(() =>
      childWithOptions(logger, {}, { msgPrefix: databaseUrl }).info(
        "child message",
      ),
    ).toThrowError(new TypeError(childOptionsError));
    expect(chunks).toEqual([]);
  });

  it("rejects child serializers and formatters without executing them", () => {
    const { chunks, logger } = createTestLogger();
    const serializer = vi.fn(() => ({
      authorization: "Bearer serializer-token",
      database: databaseUrl,
    }));
    const bindingsFormatter = vi.fn(() => ({
      password: "formatter-password",
    }));
    const logFormatter = vi.fn(() => ({
      token: "formatter-token",
    }));

    expect(() =>
      childWithOptions(
        logger,
        {},
        {
          serializers: { unsafe: serializer },
          formatters: {
            bindings: bindingsFormatter,
            log: logFormatter,
          },
        },
      ).info({ unsafe: "value" }, "child message"),
    ).toThrowError(new TypeError(childOptionsError));
    expect(serializer).not.toHaveBeenCalled();
    expect(bindingsFormatter).not.toHaveBeenCalled();
    expect(logFormatter).not.toHaveBeenCalled();
    expect(chunks).toEqual([]);
  });

  it("does not execute array index accessors", () => {
    const { chunks, logger } = createTestLogger();
    const getter = vi.fn(() => ({
      authorization: "Bearer array-accessor-token",
      database: databaseUrl,
    }));
    const values = new Array<unknown>(1);
    Object.defineProperty(values, "0", {
      configurable: true,
      enumerable: true,
      get: getter,
    });

    logger.info({ values }, "array accessor");

    expect(getter).not.toHaveBeenCalled();
    expect(parseEntry(chunks)).toMatchObject({ values: ["[Function]"] });
    expect(chunks.join("")).not.toContain("array-accessor-token");
    expect(chunks.join("")).not.toContain(databaseUrl);
  });

  it("does not prepare a lazy Error stack", () => {
    const { chunks, logger } = createTestLogger();
    const failure = new Error("prepared failure") as Error & {
      authorization: string;
    };
    failure.authorization = "Bearer prepared-stack-token";
    const originalPrepareStackTrace = Error.prepareStackTrace;
    const prepareStackTrace = vi.fn(
      (error: Error) =>
        `prepared stack ${(error as typeof failure).authorization}`,
    );

    try {
      Error.prepareStackTrace = prepareStackTrace;
      logger.error({ failure }, "lazy stack");
    } finally {
      Error.prepareStackTrace = originalPrepareStackTrace;
    }

    const entry = parseEntry(chunks);
    expect(prepareStackTrace).not.toHaveBeenCalled();
    expect(entry).toMatchObject({
      failure: {
        type: "Error",
        message: "prepared failure",
        authorization: "[Redacted]",
      },
    });
    expect(entry.failure).not.toHaveProperty("stack");
    expect(chunks.join("")).not.toContain("prepared-stack-token");
  });

  it("replaces Proxy values without triggering traps", () => {
    const { chunks, logger } = createTestLogger();
    const ownKeys = vi.fn(() => {
      throw new Error("ownKeys trap executed");
    });
    const payload = new Proxy(
      { authorization: "Bearer proxy-token", database: databaseUrl },
      { ownKeys },
    );

    expect(() => logger.info({ payload }, "proxy value")).not.toThrow();

    expect(ownKeys).not.toHaveBeenCalled();
    expect(parseEntry(chunks)).toMatchObject({ payload: "[Proxy]" });
    expect(chunks.join("")).not.toContain("proxy-token");
    expect(chunks.join("")).not.toContain(databaseUrl);
  });

  it("redacts case-insensitive sensitive key variants", () => {
    const { chunks, logger } = createTestLogger();

    logger.info(
      {
        context: {
          Authorization: "Bearer variant-token",
          apiToken: "api-token-value",
          database_url: "database-alias",
          "direct-url": "direct-alias",
          body: { private: "body-value" },
        },
      },
      "key variants",
    );

    expect(parseEntry(chunks)).toMatchObject({
      context: {
        Authorization: "[Redacted]",
        apiToken: "[Redacted]",
        database_url: "[Redacted]",
        "direct-url": "[Redacted]",
        body: "[Redacted]",
      },
    });
    expect(chunks.join("")).not.toContain("variant-token");
    expect(chunks.join("")).not.toContain("api-token-value");
    expect(chunks.join("")).not.toContain("database-alias");
    expect(chunks.join("")).not.toContain("direct-alias");
    expect(chunks.join("")).not.toContain("body-value");
  });

  it("exposes only the frozen approved logger methods", () => {
    const { logger } = createTestLogger();

    expectSafeLoggerSurface(logger);
  });

  it("blocks onChild assignment without affecting child behavior", () => {
    const { chunks, logger } = createTestLogger();
    const onChild = vi.fn();
    const runtime = logger as unknown as Record<string, unknown>;

    expect(() => {
      runtime.onChild = onChild;
    }).toThrow(TypeError);

    logger.child({ authorization: "Bearer child-token" }).info("child log");

    expect("onChild" in runtime).toBe(false);
    expect(onChild).not.toHaveBeenCalled();
    expect(chunks.join("")).not.toContain("child-token");
  });

  it("returns only void or another safe facade from approved methods", () => {
    const { chunks, logger } = createTestLogger();

    for (const level of logLevels) {
      expect(logger[level](`${level} message`)).toBeUndefined();
    }
    expect(
      logger.setBindings({ authorization: "Bearer root-binding-token" }),
    ).toBeUndefined();

    const child = logger.child({ password: "child-password" });
    const grandchild = child.child({ apiToken: "grandchild-token" });

    expectSafeLoggerSurface(child);
    expectSafeLoggerSurface(grandchild);
    expect(child).not.toBe(logger);
    expect(grandchild).not.toBe(child);
    expect(grandchild.warn("descendant message")).toBeUndefined();
    expect(chunks.join("")).not.toContain("root-binding-token");
    expect(chunks.join("")).not.toContain("child-password");
    expect(chunks.join("")).not.toContain("grandchild-token");
  });
});

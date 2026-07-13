import "server-only";

import { isProxy } from "node:util/types";
import pino, {
  type Bindings,
  type ChildLoggerOptions,
  type DestinationStream,
  type Logger,
  type LoggerOptions,
} from "pino";

import { getServerEnv, type ServerEnv } from "@/platform/env";

const REDACTED = "[Redacted]";
const FUNCTION_VALUE = "[Function]";
const PROXY_VALUE = "[Proxy]";
const SENSITIVE_KEY =
  /(authorization|cookie|password|secret|token|database.?url|direct.?url|body)/i;
const CHILD_OPTIONS_ERROR =
  "Child logger options are disabled because they can bypass log redaction. " +
  "Call child(bindings) without options.";
const CHILD_BINDINGS_ERROR =
  "Child logger bindings must be a non-Proxy object. " +
  "Pass a plain object to child(bindings) or setBindings(bindings).";

function readOwnDataProperty(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

function getAvailableKey(
  desiredKey: string,
  target: Record<string, unknown>,
): string {
  if (!Object.prototype.hasOwnProperty.call(target, desiredKey)) {
    return desiredKey;
  }

  let suffix = 2;
  while (
    Object.prototype.hasOwnProperty.call(target, `${desiredKey}#${suffix}`)
  ) {
    suffix += 1;
  }
  return `${desiredKey}#${suffix}`;
}

function sanitizeValue(
  value: unknown,
  redactText: (value: string) => string,
  seen: WeakMap<object, unknown>,
): unknown {
  if (typeof value === "string") return redactText(value);
  if (typeof value === "function") return FUNCTION_VALUE;
  if (typeof value !== "object" || value === null) return value;
  if (isProxy(value)) return PROXY_VALUE;

  const existing = seen.get(value);
  if (existing !== undefined) return existing;

  if (Array.isArray(value)) {
    const length = readOwnDataProperty(value, "length");
    const sanitized = new Array<unknown>(
      typeof length === "number" ? length : 0,
    );
    seen.set(value, sanitized);
    for (let index = 0; index < sanitized.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor) continue;
      sanitized[index] =
        "value" in descriptor
          ? sanitizeValue(descriptor.value, redactText, seen)
          : FUNCTION_VALUE;
    }
    return sanitized;
  }

  const sanitized: Record<string, unknown> = {};
  seen.set(value, sanitized);

  if (value instanceof Error) {
    const name = readOwnDataProperty(value, "name");
    const message = readOwnDataProperty(value, "message");
    const stack = readOwnDataProperty(value, "stack");
    const cause = readOwnDataProperty(value, "cause");
    sanitized.type = typeof name === "string" ? redactText(name) : "Error";
    sanitized.message = typeof message === "string" ? redactText(message) : "";
    sanitized.stack = typeof stack === "string" ? redactText(stack) : undefined;
    if (cause !== undefined) {
      sanitized.cause = sanitizeValue(cause, redactText, seen);
    }
  }

  for (const key of Object.keys(value)) {
    if (
      value instanceof Error &&
      ["name", "message", "stack", "cause"].includes(key)
    ) {
      continue;
    }
    const redactedKey = redactText(key);
    const sanitizedKey = getAvailableKey(redactedKey, sanitized);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) continue;
    const nestedValue =
      "value" in descriptor ? descriptor.value : FUNCTION_VALUE;
    Object.defineProperty(sanitized, sanitizedKey, {
      configurable: true,
      enumerable: true,
      value: SENSITIVE_KEY.test(redactedKey)
        ? REDACTED
        : sanitizeValue(nestedValue, redactText, seen),
      writable: true,
    });
  }

  return sanitized;
}

type Sanitize = (value: unknown) => unknown;

function sanitizeBindings(bindings: Bindings, sanitize: Sanitize): Bindings {
  const sanitized = sanitize(bindings);
  if (
    typeof sanitized !== "object" ||
    sanitized === null ||
    Array.isArray(sanitized)
  ) {
    throw new TypeError(CHILD_BINDINGS_ERROR);
  }
  return sanitized as Bindings;
}

function wrapLogger(logger: Logger, sanitize: Sanitize): Logger {
  return new Proxy(logger, {
    get(target, property) {
      if (property === "child") {
        return (bindings: Bindings, options?: ChildLoggerOptions): Logger => {
          if (options !== undefined) throw new TypeError(CHILD_OPTIONS_ERROR);
          return wrapLogger(
            target.child(sanitizeBindings(bindings, sanitize)),
            sanitize,
          );
        };
      }
      if (property === "setBindings") {
        return (bindings: Bindings): void => {
          target.setBindings(sanitizeBindings(bindings, sanitize));
        };
      }

      const member = Reflect.get(target, property, target) as unknown;
      return typeof member === "function" ? member.bind(target) : member;
    },
  });
}

export function createLogger(
  env: Pick<ServerEnv, "LOG_LEVEL" | "DATABASE_URL" | "DIRECT_URL">,
  destination?: DestinationStream,
): Logger {
  const sensitiveValues = [env.DATABASE_URL, env.DIRECT_URL].filter(Boolean);
  const redactText = (value: string) =>
    sensitiveValues.reduce(
      (result, secret) => result.replaceAll(secret, REDACTED),
      value,
    );
  const sanitize: Sanitize = (value) =>
    sanitizeValue(value, redactText, new WeakMap<object, unknown>());
  const options: LoggerOptions = {
    level: env.LOG_LEVEL,
    base: undefined,
    formatters: {
      bindings(bindings) {
        return sanitize(bindings) as Record<string, unknown>;
      },
    },
    hooks: {
      logMethod(inputArgs, method) {
        const seen = new WeakMap<object, unknown>();
        const sanitizedArgs = inputArgs.map((value) =>
          sanitizeValue(value, redactText, seen),
        ) as Parameters<typeof method>;
        method.apply(this, sanitizedArgs);
      },
    },
  };

  const logger = destination ? pino(options, destination) : pino(options);
  return wrapLogger(logger, sanitize);
}

let logger: Logger | undefined;

export function getLogger(): Logger {
  logger ??= createLogger(getServerEnv());
  return logger;
}

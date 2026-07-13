import "server-only";

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
const ERROR_STACK_GETTER = Object.getOwnPropertyDescriptor(
  new Error(),
  "stack",
)?.get;
const SENSITIVE_KEYS = new Set([
  "authorization",
  "cookie",
  "password",
  "secret",
  "token",
  "databaseurl",
  "directurl",
  "requestbody",
]);

function readDataProperty(value: object, key: string): unknown {
  let current: object | null = value;
  while (current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor) {
      if ("value" in descriptor) return descriptor.value;
      const getter = descriptor.get;
      if (key === "stack" && getter && getter === ERROR_STACK_GETTER) {
        return getter.call(value) as unknown;
      }
      return undefined;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  return undefined;
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

  const existing = seen.get(value);
  if (existing !== undefined) return existing;

  if (Array.isArray(value)) {
    const sanitized = new Array<unknown>(value.length);
    seen.set(value, sanitized);
    for (let index = 0; index < value.length; index += 1) {
      if (index in value) {
        sanitized[index] = sanitizeValue(value[index], redactText, seen);
      }
    }
    return sanitized;
  }

  const sanitized: Record<string, unknown> = {};
  seen.set(value, sanitized);

  if (value instanceof Error) {
    const name = readDataProperty(value, "name");
    const message = readDataProperty(value, "message");
    const stack = readDataProperty(value, "stack");
    const cause = readDataProperty(value, "cause");
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
    const sanitizedKey = getAvailableKey(redactText(key), sanitized);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) continue;
    const nestedValue =
      "value" in descriptor ? descriptor.value : FUNCTION_VALUE;
    Object.defineProperty(sanitized, sanitizedKey, {
      configurable: true,
      enumerable: true,
      value: SENSITIVE_KEYS.has(key.toLowerCase())
        ? REDACTED
        : sanitizeValue(nestedValue, redactText, seen),
      writable: true,
    });
  }

  return sanitized;
}

type Sanitize = (value: unknown) => unknown;

function wrapLogger(logger: Logger, sanitize: Sanitize): Logger {
  return new Proxy(logger, {
    get(target, property) {
      if (property === "child") {
        return (bindings: Bindings, options?: ChildLoggerOptions): Logger =>
          wrapLogger(
            target.child(sanitize(bindings) as Bindings, options),
            sanitize,
          );
      }
      if (property === "setBindings") {
        return (bindings: Bindings): void => {
          target.setBindings(sanitize(bindings) as Bindings);
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

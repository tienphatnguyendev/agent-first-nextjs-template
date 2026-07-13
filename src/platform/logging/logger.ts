import "server-only";

import pino, {
  type DestinationStream,
  type Logger,
  type LoggerOptions,
} from "pino";

import { getServerEnv, type ServerEnv } from "@/platform/env";

const REDACTED = "[Redacted]";
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

function sanitizeValue(
  value: unknown,
  redactText: (value: string) => string,
  seen: WeakMap<object, unknown>,
): unknown {
  if (typeof value === "string") return redactText(value);
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
    sanitized.type = redactText(value.name);
    sanitized.message = redactText(value.message);
    sanitized.stack = value.stack ? redactText(value.stack) : undefined;
    if (value.cause !== undefined) {
      sanitized.cause = sanitizeValue(value.cause, redactText, seen);
    }
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (
      value instanceof Error &&
      ["name", "message", "stack", "cause"].includes(key)
    ) {
      continue;
    }
    sanitized[key] = SENSITIVE_KEYS.has(key.toLowerCase())
      ? REDACTED
      : sanitizeValue(nestedValue, redactText, seen);
  }

  return sanitized;
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
  const options: LoggerOptions = {
    level: env.LOG_LEVEL,
    base: undefined,
    formatters: {
      bindings(bindings) {
        return sanitizeValue(
          bindings,
          redactText,
          new WeakMap<object, unknown>(),
        ) as Record<string, unknown>;
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

  return destination ? pino(options, destination) : pino(options);
}

let logger: Logger | undefined;

export function getLogger(): Logger {
  logger ??= createLogger(getServerEnv());
  return logger;
}

import "server-only";

import { isProxy } from "node:util/types";
import pino, {
  type DestinationStream,
  type Logger as PinoLogger,
  type LoggerOptions,
} from "pino";

import { getServerEnv, type ServerEnv } from "@/platform/env";

const REDACTED = "[Redacted]";
const FUNCTION_VALUE = "[Function]";
const PROXY_VALUE = "[Proxy]";
const SYMBOL_VALUE = "[Symbol]";
const SENSITIVE_KEY =
  /(authorization|cookie|password|secret|token|database.?url|direct.?url|body)/i;
const CHILD_OPTIONS_ERROR =
  "Child logger options are disabled because they can bypass log redaction. " +
  "Call child(bindings) without options.";
const CHILD_BINDINGS_ERROR =
  "Child logger bindings must be a non-Proxy object. " +
  "Pass a plain object to child(bindings) or setBindings(bindings).";
type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";
export type LogBindings = Record<string, unknown>;
export type LogMethod = (...args: unknown[]) => void;

export interface ApplicationLogger {
  readonly trace: LogMethod;
  readonly debug: LogMethod;
  readonly info: LogMethod;
  readonly warn: LogMethod;
  readonly error: LogMethod;
  readonly fatal: LogMethod;
  readonly child: (bindings: LogBindings) => ApplicationLogger;
  readonly setBindings: (bindings: LogBindings) => void;
}

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
  if (typeof value === "symbol") return SYMBOL_VALUE;
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

function sanitizeBindings(
  bindings: LogBindings,
  sanitize: Sanitize,
): LogBindings {
  const sanitized = sanitize(bindings);
  if (
    typeof sanitized !== "object" ||
    sanitized === null ||
    Array.isArray(sanitized)
  ) {
    throw new TypeError(CHILD_BINDINGS_ERROR);
  }
  return sanitized as LogBindings;
}

function createLogMethod(
  logger: PinoLogger,
  level: LogLevel,
  redactText: (value: string) => string,
): LogMethod {
  const method = logger[level] as LogMethod;
  return (...inputArgs: unknown[]): void => {
    const seen = new WeakMap<object, unknown>();
    const sanitizedArgs = inputArgs.map((value) =>
      sanitizeValue(value, redactText, seen),
    );
    Reflect.apply(method, logger, sanitizedArgs);
  };
}

function createFacade(
  logger: PinoLogger,
  sanitize: Sanitize,
  redactText: (value: string) => string,
): ApplicationLogger {
  const child = (
    bindings: LogBindings,
    ...runtimeOptions: unknown[]
  ): ApplicationLogger => {
    if (runtimeOptions.length > 0) throw new TypeError(CHILD_OPTIONS_ERROR);
    const rawChild = logger.child(sanitizeBindings(bindings, sanitize));
    return createFacade(rawChild, sanitize, redactText);
  };
  const setBindings = (bindings: LogBindings): void => {
    logger.setBindings(sanitizeBindings(bindings, sanitize));
  };
  const facade = Object.assign(Object.create(null) as ApplicationLogger, {
    trace: createLogMethod(logger, "trace", redactText),
    debug: createLogMethod(logger, "debug", redactText),
    info: createLogMethod(logger, "info", redactText),
    warn: createLogMethod(logger, "warn", redactText),
    error: createLogMethod(logger, "error", redactText),
    fatal: createLogMethod(logger, "fatal", redactText),
    child,
    setBindings,
  } satisfies ApplicationLogger);
  return Object.freeze(facade);
}

export function createLogger(
  env: Pick<ServerEnv, "LOG_LEVEL" | "DATABASE_URL" | "DIRECT_URL">,
  destination?: DestinationStream,
): ApplicationLogger {
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
  };

  const logger = destination ? pino(options, destination) : pino(options);
  return createFacade(logger, sanitize, redactText);
}

let logger: ApplicationLogger | undefined;

export function getLogger(): ApplicationLogger {
  logger ??= createLogger(getServerEnv());
  return logger;
}

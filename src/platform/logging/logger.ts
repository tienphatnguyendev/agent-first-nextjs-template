import "server-only";

import pino, {
  type DestinationStream,
  type Logger,
  type LoggerOptions,
} from "pino";

import { getServerEnv, type ServerEnv } from "@/platform/env";

const REDACTED_PATHS = [
  "authorization",
  "cookie",
  "password",
  "secret",
  "token",
  "databaseUrl",
  "directUrl",
  "req.headers.authorization",
  "req.headers.cookie",
  "requestBody",
];

export function createLogger(
  env: Pick<ServerEnv, "LOG_LEVEL" | "DATABASE_URL" | "DIRECT_URL">,
  destination?: DestinationStream,
): Logger {
  const sensitiveValues = [env.DATABASE_URL, env.DIRECT_URL];
  const redactText = (value: string | undefined) =>
    sensitiveValues.reduce(
      (result, secret) => result.replaceAll(secret, "[Redacted]"),
      value ?? "",
    );
  const options: LoggerOptions = {
    level: env.LOG_LEVEL,
    redact: { paths: REDACTED_PATHS, censor: "[Redacted]" },
    base: undefined,
    serializers: {
      err(value) {
        if (!(value instanceof Error)) return value;
        return {
          type: value.name,
          message: redactText(value.message),
          stack: redactText(value.stack),
        };
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

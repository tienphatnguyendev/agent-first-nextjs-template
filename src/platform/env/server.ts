import "server-only";

import { z } from "zod";

const postgresUrl = z
  .string()
  .min(1)
  .refine(
    (value) => {
      try {
        return ["postgres:", "postgresql:"].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    },
    { message: "must be a PostgreSQL URL" },
  );

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  DATABASE_URL: postgresUrl,
  DIRECT_URL: postgresUrl,
});

export type ServerEnv = z.infer<typeof schema>;

export class EnvironmentValidationError extends Error {
  constructor(readonly variables: readonly string[]) {
    super(`Invalid server environment variables: ${variables.join(", ")}`);
    this.name = "EnvironmentValidationError";
  }
}

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  const result = schema.safeParse(source);
  if (!result.success) {
    const variables = [
      ...new Set(result.error.issues.map((issue) => String(issue.path[0]))),
    ].sort();
    throw new EnvironmentValidationError(variables);
  }
  return result.data;
}

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}

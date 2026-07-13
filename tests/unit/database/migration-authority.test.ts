import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readRepositoryFile(path: string): string {
  return readFileSync(resolve(path), "utf8");
}

describe("database migration authority", () => {
  it("keeps Supabase migrations disabled", () => {
    expect(existsSync(resolve("supabase/migrations"))).toBe(false);
  });

  it("runs only PostgreSQL 17 in the local Supabase project", () => {
    const config = readRepositoryFile("supabase/config.toml");

    expect(config).toContain('project_id = "agentic-coding-os"');
    expect(config).toContain("port = 54322");
    expect(config).toContain("shadow_port = 54320");
    expect(config).toContain("major_version = 17");

    for (const section of [
      "api",
      "db.pooler",
      "db.seed",
      "auth",
      "realtime",
      "storage",
      "studio",
      "edge_runtime",
    ]) {
      expect(config).toMatch(
        new RegExp(`\\[${section.replace(".", "\\.")}\\]\\s+enabled = false`),
      );
    }
  });

  it("defines Prisma as the PostgreSQL schema authority", () => {
    const schema = readRepositoryFile("prisma/schema.prisma");
    const migrationLock = readRepositoryFile(
      "prisma/migrations/migration_lock.toml",
    );

    expect(schema).toContain('provider = "prisma-client"');
    expect(schema).toContain('output   = "../src/generated/prisma"');
    expect(schema).toContain('provider = "postgresql"');
    expect(migrationLock.trim()).toBe('provider = "postgresql"');
  });

  it("contains one empty baseline migration and no product schema", () => {
    const migrationsDirectory = resolve("prisma/migrations");
    const migrationDirectories = readdirSync(migrationsDirectory, {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    const baseline = readRepositoryFile(
      "prisma/migrations/20260713000000_init/migration.sql",
    );
    const executableSql = baseline
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("--"));

    expect(migrationDirectories).toEqual(["20260713000000_init"]);
    expect(baseline).toContain("Prisma");
    expect(baseline).toContain("no product tables");
    expect(executableSql).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";

import {
  assertLocalDirectUrl,
  buildDatabaseCommands,
} from "../../../scripts/database";

const localDirectUrl =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public";

const startCommands = [
  { bin: "docker", args: ["info"] },
  {
    bin: "pnpm",
    args: [
      "exec",
      "supabase",
      "start",
      "--exclude",
      "gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor",
    ],
  },
];

describe("database lifecycle commands", () => {
  it("allows only the local Supabase direct connection", () => {
    expect(() => assertLocalDirectUrl(localDirectUrl)).not.toThrow();
    expect(() =>
      assertLocalDirectUrl(
        "postgresql://postgres:secret@db.example.com:5432/postgres",
      ),
    ).toThrow("DIRECT_URL must point to local Supabase on port 54322");
    expect(() =>
      assertLocalDirectUrl(
        "postgresql://postgres:secret@127.0.0.1:5432/postgres",
      ),
    ).toThrow("DIRECT_URL must point to local Supabase on port 54322");
  });

  it.each([
    "postgresql://postgres:postgres@127.0.0.1:54322/other?schema=public",
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=private",
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public&sslmode=disable",
  ])(
    "rejects a local URL outside the exact administrative target: %s",
    (url) => {
      expect(() => assertLocalDirectUrl(url)).toThrow(
        "DIRECT_URL must point to local Supabase on port 54322",
      );
    },
  );

  it.each(["host", "hostaddr", "port", "socket", "service", "servicefile"])(
    "rejects the endpoint-changing %s query parameter",
    (parameter) => {
      const url = `${localDirectUrl}&${parameter}=db.example.com`;

      expect(() => assertLocalDirectUrl(url)).toThrow(
        "DIRECT_URL must point to local Supabase on port 54322",
      );
      expect(() => buildDatabaseCommands("reset", [], url)).toThrow(
        "DIRECT_URL must point to local Supabase on port 54322",
      );
    },
  );

  it("decodes query parameter names before it validates the allowlist", () => {
    const url = `${localDirectUrl}&%68ost=db.example.com`;

    expect(() => assertLocalDirectUrl(url)).toThrow(
      "DIRECT_URL must point to local Supabase on port 54322",
    );
  });

  it("starts Docker and excludes every non-database Supabase service", () => {
    expect(buildDatabaseCommands("start", [], "")).toEqual(startCommands);
  });

  it("generates Prisma and deploys migrations during setup", () => {
    expect(buildDatabaseCommands("setup", [], localDirectUrl)).toEqual([
      ...startCommands,
      { bin: "pnpm", args: ["exec", "prisma", "generate"] },
      { bin: "pnpm", args: ["exec", "prisma", "migrate", "deploy"] },
    ]);
  });

  it("creates a named local migration after starting the database", () => {
    expect(
      buildDatabaseCommands(
        "migrate",
        ["--name", "add_job_status"],
        localDirectUrl,
      ),
    ).toEqual([
      ...startCommands,
      {
        bin: "pnpm",
        args: ["exec", "prisma", "migrate", "dev", "--name", "add_job_status"],
      },
    ]);
  });

  it.each([
    [[]],
    [["--name"]],
    [["--name", "AddJobStatus"]],
    [["--name", "add job status"]],
  ])("rejects an invalid migration name: %j", (args) => {
    expect(() =>
      buildDatabaseCommands("migrate", args, localDirectUrl),
    ).toThrow("db:migrate requires --name <lowercase_description>");
  });

  it("resets only the local Supabase database", () => {
    expect(buildDatabaseCommands("reset", [], localDirectUrl)).toEqual([
      {
        bin: "pnpm",
        args: ["exec", "prisma", "migrate", "reset", "--force"],
      },
    ]);

    expect(() =>
      buildDatabaseCommands(
        "reset",
        [],
        "postgresql://postgres:secret@db.example.com:5432/postgres",
      ),
    ).toThrow("DIRECT_URL must point to local Supabase on port 54322");
  });
});

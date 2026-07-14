import "dotenv/config";

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export type DatabaseAction = "start" | "setup" | "migrate" | "reset";

export interface Command {
  bin: string;
  args: string[];
}

const excludedSupabaseServices =
  "gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor";

const startCommands: Command[] = [
  { bin: "docker", args: ["info"] },
  {
    bin: "pnpm",
    args: ["exec", "supabase", "start", "--exclude", excludedSupabaseServices],
  },
];

const localDirectUrlError =
  "DIRECT_URL must point to local Supabase on port 54322.";
const migrationNameError =
  "db:migrate requires --name <lowercase_description>.";

export function assertLocalDirectUrl(value: string): void {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(localDirectUrlError);
  }

  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname !== "127.0.0.1" ||
    url.port !== "54322" ||
    url.pathname !== "/postgres" ||
    url.searchParams.size !== 1 ||
    url.searchParams.get("schema") !== "public"
  ) {
    throw new Error(localDirectUrlError);
  }
}

function validateNoArguments(action: DatabaseAction, args: string[]): void {
  if (args.length > 0) {
    throw new Error(`db:${action} does not accept arguments.`);
  }
}

export function buildDatabaseCommands(
  action: DatabaseAction,
  args: string[],
  directUrl: string,
): Command[] {
  if (action === "start") {
    validateNoArguments(action, args);
    return startCommands;
  }

  if (action === "setup") {
    validateNoArguments(action, args);
    assertLocalDirectUrl(directUrl);
    return [
      ...startCommands,
      { bin: "pnpm", args: ["exec", "prisma", "generate"] },
      { bin: "pnpm", args: ["exec", "prisma", "migrate", "deploy"] },
    ];
  }

  if (action === "migrate") {
    assertLocalDirectUrl(directUrl);
    const migrationName = args[1];
    if (
      args.length !== 2 ||
      args[0] !== "--name" ||
      !migrationName ||
      !/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(migrationName)
    ) {
      throw new Error(migrationNameError);
    }

    return [
      ...startCommands,
      {
        bin: "pnpm",
        args: ["exec", "prisma", "migrate", "dev", "--name", migrationName],
      },
    ];
  }

  validateNoArguments(action, args);
  assertLocalDirectUrl(directUrl);
  return [
    {
      bin: "pnpm",
      args: ["exec", "prisma", "migrate", "reset", "--force"],
    },
  ];
}

function printRepair(message: string): void {
  process.stderr.write(`${message}\n`);
  process.stderr.write(
    "Repair: resolve the reported problem, then rerun the database command.\n",
  );
}

function runCommand(command: Command): number {
  const exactCommand = [command.bin, ...command.args].join(" ");
  const result = spawnSync(command.bin, command.args, { stdio: "inherit" });

  if (result.error) {
    process.stderr.write(`${result.error.message}\n`);
  }

  if (result.error || result.status !== 0) {
    printRepair(`Failed command: ${exactCommand}`);
    return result.status ?? 1;
  }

  return 0;
}

function main(): void {
  const [requestedAction, ...args] = process.argv.slice(2);
  if (
    !requestedAction ||
    !["start", "setup", "migrate", "reset"].includes(requestedAction)
  ) {
    printRepair(
      "Usage: pnpm db:start | db:setup | db:migrate --name <lowercase_description> | db:reset",
    );
    process.exitCode = 1;
    return;
  }

  let commands: Command[];
  try {
    commands = buildDatabaseCommands(
      requestedAction as DatabaseAction,
      args,
      process.env.DIRECT_URL ?? "",
    );
  } catch (error) {
    printRepair(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  for (const command of commands) {
    const exitCode = runCommand(command);
    if (exitCode !== 0) {
      process.exitCode = exitCode;
      return;
    }
  }
}

const entrypoint = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entrypoint === fileURLToPath(import.meta.url)) {
  main();
}

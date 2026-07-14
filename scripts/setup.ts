import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface Command {
  bin: string;
  args: string[];
}

interface SetupProcessResult {
  readonly status: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly error?: Error;
}

type SpawnCommand = (
  command: string,
  args: readonly string[],
  options: { readonly cwd: string; readonly stdio: "inherit" },
) => SetupProcessResult;

interface SetupOptions {
  readonly ci?: boolean;
  readonly cwd?: string;
  readonly spawn?: SpawnCommand;
  readonly npmExecPath?: string | null;
  readonly nodeExecPath?: string;
  readonly writeError?: (message: string) => void;
}

export function buildSetupCommands(ci: boolean): Command[] {
  return [
    { bin: "pnpm", args: ["db:setup"] },
    {
      bin: "pnpm",
      args: [
        "exec",
        "playwright",
        "install",
        ...(ci ? ["--with-deps"] : []),
        "chromium",
      ],
    },
  ];
}

const spawnCommand: SpawnCommand = (command, args, options) =>
  spawnSync(command, [...args], options);

function failureReason(result: SetupProcessResult): string | undefined {
  if (result.error) return `Could not start command: ${result.error.message}`;
  if (result.signal) return `Command stopped after signal ${result.signal}`;
  if (result.status === null) return "Command returned no exit status";
  return undefined;
}

export function runSetup(options: SetupOptions = {}): number {
  const ci = options.ci ?? Boolean(process.env.CI);
  const cwd = options.cwd ?? process.cwd();
  const spawn = options.spawn ?? spawnCommand;
  const npmExecPath =
    options.npmExecPath === undefined
      ? process.env.npm_execpath
      : options.npmExecPath;
  const nodeExecPath = options.nodeExecPath ?? process.execPath;
  const writeError =
    options.writeError ?? ((message: string) => process.stderr.write(message));

  if (!existsSync(resolve(cwd, ".env"))) {
    writeError(
      "Create .env from .env.example before running pnpm run setup.\n",
    );
    return 1;
  }

  for (const command of buildSetupCommands(ci)) {
    const exactCommand = [command.bin, ...command.args].join(" ");
    const executable =
      command.bin === "pnpm" && npmExecPath ? nodeExecPath : command.bin;
    const args =
      command.bin === "pnpm" && npmExecPath
        ? [npmExecPath, ...command.args]
        : command.args;
    const result = spawn(executable, args, { cwd, stdio: "inherit" });
    const reason = failureReason(result);

    if (reason || result.status !== 0) {
      if (reason) writeError(`${reason}\n`);
      writeError(`Failed command: ${exactCommand}\n`);
      writeError(
        "Repair: resolve the reported problem, then rerun pnpm run setup.\n",
      );
      return result.status && result.status > 0 ? result.status : 1;
    }
  }

  return 0;
}

const entrypoint = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entrypoint === fileURLToPath(import.meta.url)) {
  process.exitCode = runSetup();
}

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface VerificationCheck {
  label: string;
  script: string;
  repair: string;
}

export type CommandRunner = (script: string) => number;

interface VerificationProcessResult {
  readonly status: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly error?: Error;
}

type SpawnCommand = (
  command: string,
  args: readonly string[],
  options: { readonly stdio: "inherit" },
) => VerificationProcessResult;

interface CommandRunnerOptions {
  readonly spawn?: SpawnCommand;
  readonly npmExecPath?: string;
  readonly nodeExecPath?: string;
}

export const CHECKS: readonly VerificationCheck[] = [
  {
    label: "Documentation structure",
    script: "docs:check",
    repair: "pnpm docs:check",
  },
  { label: "Formatting", script: "format:check", repair: "pnpm format" },
  { label: "ESLint", script: "lint", repair: "pnpm lint" },
  {
    label: "Architecture boundaries",
    script: "architecture",
    repair: "pnpm architecture",
  },
  { label: "TypeScript", script: "typecheck", repair: "pnpm typecheck" },
  { label: "Unit tests", script: "test:unit", repair: "pnpm test:unit" },
  {
    label: "Integration tests",
    script: "test:integration",
    repair: "pnpm test:integration",
  },
  { label: "Production build", script: "build", repair: "pnpm build" },
  {
    label: "Playwright smoke tests",
    script: "test:e2e:run",
    repair: "pnpm test:e2e",
  },
];

const spawnCommand: SpawnCommand = (command, args, options) =>
  spawnSync(command, [...args], options);

export function createCommandRunner({
  spawn = spawnCommand,
  npmExecPath = process.env.npm_execpath,
  nodeExecPath = process.execPath,
}: CommandRunnerOptions = {}): CommandRunner {
  return (script) => {
    const command = npmExecPath ? nodeExecPath : "pnpm";
    const args = npmExecPath ? [npmExecPath, script] : [script];
    const result = spawn(command, args, { stdio: "inherit" });

    if (result.error) {
      throw new Error(
        `the package manager could not start: ${result.error.message}`,
      );
    }
    if (result.signal) {
      throw new Error(
        `the package manager stopped after signal ${result.signal}`,
      );
    }
    if (result.status === null) {
      throw new Error("the package manager returned no exit status");
    }

    return result.status;
  };
}

const defaultRunner = createCommandRunner();

export function runVerification(runner: CommandRunner = defaultRunner): void {
  for (const check of CHECKS) {
    console.log(`\n==> ${check.label}`);
    let exitCode: number;
    try {
      exitCode = runner(check.script);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `${check.label} failed because ${reason}. ` +
          `Reproduce and repair it with: ${check.repair}`,
      );
    }

    if (exitCode !== 0) {
      throw new Error(
        `${check.label} failed. Reproduce and repair it with: ${check.repair}`,
      );
    }
  }

  console.log("\nAll repository checks passed.");
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    runVerification();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

import { spawn } from "node:child_process";
import { constants } from "node:os";
import { createWriteStream, mkdirSync, type WriteStream } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { EventEmitter } from "node:events";

interface ProductionChild {
  readonly stdout: NodeJS.ReadableStream | null;
  readonly stderr: NodeJS.ReadableStream | null;
  kill(signal: NodeJS.Signals): boolean;
  once(event: "error", listener: (error: Error) => void): unknown;
  once(
    event: "close",
    listener: (status: number | null, signal: NodeJS.Signals | null) => void,
  ): unknown;
}

type SpawnProductionProcess = (
  command: string,
  args: readonly string[],
  options: {
    readonly cwd: string;
    readonly stdio: ["ignore", "pipe", "pipe"];
  },
) => ProductionChild;

interface OutputSink {
  write(chunk: string | Uint8Array): boolean;
}

interface ProductionServerOptions {
  readonly cwd?: string;
  readonly spawn?: SpawnProductionProcess;
  readonly npmExecPath?: string | null;
  readonly nodeExecPath?: string;
  readonly stdout?: OutputSink;
  readonly stderr?: OutputSink;
  readonly processSignals?: Pick<EventEmitter, "on" | "off">;
}

const spawnProductionProcess: SpawnProductionProcess = (
  command,
  args,
  options,
) => spawn(command, [...args], options);

function closeLog(applicationLog: WriteStream): Promise<void> {
  return new Promise((resolveClose) => applicationLog.end(resolveClose));
}

function signalExitCode(signal: NodeJS.Signals): number {
  const signalNumber = constants.signals[signal];
  return signalNumber ? 128 + signalNumber : 1;
}

function copyOutput(
  source: NodeJS.ReadableStream | null,
  terminal: OutputSink,
  applicationLog: WriteStream,
): void {
  source?.on("data", (chunk: string | Uint8Array) => {
    terminal.write(chunk);
    applicationLog.write(chunk);
  });
}

export async function runProductionServer(
  options: ProductionServerOptions = {},
): Promise<number> {
  const cwd = options.cwd ?? process.cwd();
  const spawnProcess = options.spawn ?? spawnProductionProcess;
  const npmExecPath =
    options.npmExecPath === undefined
      ? process.env.npm_execpath
      : options.npmExecPath;
  const nodeExecPath = options.nodeExecPath ?? process.execPath;
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const processSignals = options.processSignals ?? process;
  const artifactDirectory = resolve(cwd, "artifacts");
  mkdirSync(artifactDirectory, { recursive: true });
  const applicationLog = createWriteStream(
    resolve(artifactDirectory, "application.log"),
    { flags: "w" },
  );
  const exactCommand = "pnpm start";
  const command = npmExecPath ? nodeExecPath : "pnpm";
  const args = npmExecPath ? [npmExecPath, "start"] : ["start"];

  const writeFailure = (message: string) => {
    stderr.write(message);
    applicationLog.write(message);
  };
  const reportFailure = (reason: string) => {
    writeFailure(`${reason}\n`);
    writeFailure(`Failed command: ${exactCommand}\n`);
    writeFailure(
      "Repair: run pnpm run build, then rerun pnpm run test:e2e:run.\n",
    );
  };

  let child: ProductionChild;
  try {
    child = spawnProcess(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    reportFailure(`Could not start command: ${reason}`);
    await closeLog(applicationLog);
    return 1;
  }

  copyOutput(child.stdout, stdout, applicationLog);
  copyOutput(child.stderr, stderr, applicationLog);

  return new Promise((resolveExit) => {
    let settled = false;
    let childClosed = false;
    const forwardedSignals = new Set<NodeJS.Signals>();

    const forwardSignal = (signal: NodeJS.Signals) => {
      if (childClosed || forwardedSignals.has(signal)) return;
      forwardedSignals.add(signal);
      child.kill(signal);
    };
    const onSigint = () => forwardSignal("SIGINT");
    const onSigterm = () => forwardSignal("SIGTERM");
    const onExit = () => forwardSignal("SIGTERM");
    const cleanUpListeners = () => {
      processSignals.off("SIGINT", onSigint);
      processSignals.off("SIGTERM", onSigterm);
      processSignals.off("exit", onExit);
    };
    const finish = (exitCode: number) => {
      if (settled) return;
      settled = true;
      childClosed = true;
      cleanUpListeners();
      applicationLog.end(() => resolveExit(exitCode));
    };

    processSignals.on("SIGINT", onSigint);
    processSignals.on("SIGTERM", onSigterm);
    processSignals.on("exit", onExit);

    child.once("error", (error) => {
      reportFailure(`Could not start command: ${error.message}`);
      finish(1);
    });
    child.once("close", (status, signal) => {
      childClosed = true;
      if (status !== null) {
        if (status !== 0) {
          reportFailure(`Command exited with status ${status}`);
        }
        finish(status);
        return;
      }
      if (signal) {
        finish(signalExitCode(signal));
        return;
      }

      reportFailure("Command returned no exit status");
      finish(1);
    });
  });
}

const entrypoint = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entrypoint === fileURLToPath(import.meta.url)) {
  process.exitCode = await runProductionServer();
}

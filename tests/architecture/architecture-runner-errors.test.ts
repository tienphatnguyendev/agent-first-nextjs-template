import { describe, expect, it } from "vitest";

interface ProcessResult {
  readonly status: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly error?: Error;
}

type Execute = (sourcePath: string) => ProcessResult;

interface Output {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
}

type RunDependencyCruiser = (
  fixture: { readonly name: string },
  execute: Execute,
  output: Output,
) => { readonly exitCode: number; readonly output: string };

async function loadRunner() {
  const runnerModule =
    await import("../../scripts/check-architecture-fixtures");
  return Reflect.get(runnerModule, "runDependencyCruiser") as
    RunDependencyCruiser | undefined;
}

describe("architecture fixture runner failures", () => {
  it("reports a spawn error and repair guidance when output fields are absent", async () => {
    const runDependencyCruiser = await loadRunner();
    expect(runDependencyCruiser).toBeTypeOf("function");
    if (!runDependencyCruiser) return;

    const stdout: string[] = [];
    const stderr: string[] = [];
    const result = runDependencyCruiser(
      { name: "valid-public-import" },
      () => ({
        status: null,
        signal: null,
        stdout: undefined,
        stderr: undefined,
        error: new Error("spawn blocked"),
      }),
      {
        stdout: (text) => stdout.push(text),
        stderr: (text) => stderr.push(text),
      },
    );
    const output = `${stdout.join("")}${stderr.join("")}`;

    expect(result.exitCode).toBe(1);
    expect(output).toContain("spawn blocked");
    expect(output).toContain("Repair:");
    expect(output).not.toContain("ERR_INVALID_ARG_TYPE");
  }, 20_000);

  it("reports a process signal and preserves available output", async () => {
    const runDependencyCruiser = await loadRunner();
    expect(runDependencyCruiser).toBeTypeOf("function");
    if (!runDependencyCruiser) return;

    const stdout: string[] = [];
    const stderr: string[] = [];
    const result = runDependencyCruiser(
      { name: "valid-public-import" },
      () => ({
        status: null,
        signal: "SIGTERM",
        stdout: "dependency-cruiser partial output\n",
        stderr: undefined,
      }),
      {
        stdout: (text) => stdout.push(text),
        stderr: (text) => stderr.push(text),
      },
    );
    const output = `${stdout.join("")}${stderr.join("")}`;

    expect(result.exitCode).toBe(1);
    expect(output).toContain("dependency-cruiser partial output");
    expect(output).toContain("SIGTERM");
    expect(output).toContain("Repair:");
  });

  it("reports when the process ends without an exit status", async () => {
    const runDependencyCruiser = await loadRunner();
    expect(runDependencyCruiser).toBeTypeOf("function");
    if (!runDependencyCruiser) return;

    const stdout: string[] = [];
    const stderr: string[] = [];
    const result = runDependencyCruiser(
      { name: "valid-public-import" },
      () => ({
        status: null,
        signal: null,
        stdout: undefined,
        stderr: undefined,
      }),
      {
        stdout: (text) => stdout.push(text),
        stderr: (text) => stderr.push(text),
      },
    );
    const output = `${stdout.join("")}${stderr.join("")}`;

    expect(result.exitCode).toBe(1);
    expect(output).toContain("ended without an exit status");
    expect(output).toContain("Repair:");
    expect(result.output).toContain("Repair:");
  });
});

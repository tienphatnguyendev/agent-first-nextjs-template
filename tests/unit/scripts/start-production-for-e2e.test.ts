import { EventEmitter } from "node:events";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runProductionServer } from "../../../scripts/start-production-for-e2e";

class FakeChild extends EventEmitter {
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  readonly kill = vi.fn(() => true);
}

function captureStream() {
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on("data", (chunk: Buffer) => chunks.push(chunk));
  return { stream, text: () => Buffer.concat(chunks).toString("utf8") };
}

describe("runProductionServer", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "agentic-coding-os-production-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("runs pnpm start and copies both output streams to the application log", async () => {
    const child = new FakeChild();
    const spawn = vi.fn(() => child);
    const stdout = captureStream();
    const stderr = captureStream();

    const result = runProductionServer({
      cwd: root,
      spawn,
      npmExecPath: "/tools/pnpm.cjs",
      nodeExecPath: "/tools/node",
      stdout: stdout.stream,
      stderr: stderr.stream,
      processSignals: new EventEmitter(),
    });
    child.stdout.emit("data", Buffer.from("server ready\n"));
    child.stderr.emit("data", Buffer.from("server warning\n"));
    child.emit("close", 0, null);

    await expect(result).resolves.toBe(0);
    expect(spawn).toHaveBeenCalledWith(
      "/tools/node",
      ["/tools/pnpm.cjs", "start"],
      {
        cwd: root,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    expect(stdout.text()).toBe("server ready\n");
    expect(stderr.text()).toBe("server warning\n");
    expect(readFileSync(join(root, "artifacts/application.log"), "utf8")).toBe(
      "server ready\nserver warning\n",
    );
  });

  it.each(["SIGINT", "SIGTERM"] as const)(
    "forwards %s to the child only once",
    async (signal) => {
      const child = new FakeChild();
      const processSignals = new EventEmitter();
      const result = runProductionServer({
        cwd: root,
        spawn: () => child,
        processSignals,
      });

      processSignals.emit(signal);
      processSignals.emit(signal);
      child.emit("close", null, signal);

      await expect(result).resolves.toBeGreaterThan(128);
      expect(child.kill).toHaveBeenCalledTimes(1);
      expect(child.kill).toHaveBeenCalledWith(signal);
    },
  );

  it("stops a live child when the wrapper process exits", async () => {
    const child = new FakeChild();
    const processSignals = new EventEmitter();
    const result = runProductionServer({
      cwd: root,
      spawn: () => child,
      processSignals,
    });

    processSignals.emit("exit");
    processSignals.emit("exit");
    child.emit("close", null, "SIGTERM");

    await expect(result).resolves.toBeGreaterThan(128);
    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
  });

  it("reports a spawn error with the exact command and repair guidance", async () => {
    const child = new FakeChild();
    const stderr = captureStream();
    const result = runProductionServer({
      cwd: root,
      spawn: () => child,
      stderr: stderr.stream,
      processSignals: new EventEmitter(),
    });

    child.emit("error", new Error("spawn blocked"));

    await expect(result).resolves.toBe(1);
    expect(stderr.text()).toContain("Could not start command: spawn blocked");
    expect(stderr.text()).toContain("Failed command: pnpm start");
    expect(stderr.text()).toContain("Repair:");
  });

  it("reports a missing child exit status", async () => {
    const child = new FakeChild();
    const stderr = captureStream();
    const result = runProductionServer({
      cwd: root,
      spawn: () => child,
      stderr: stderr.stream,
      processSignals: new EventEmitter(),
    });

    child.emit("close", null, null);

    await expect(result).resolves.toBe(1);
    expect(stderr.text()).toContain("Command returned no exit status");
    expect(stderr.text()).toContain("Failed command: pnpm start");
    expect(existsSync(join(root, "artifacts/application.log"))).toBe(true);
  });

  it("reports and preserves an ordinary non-zero child exit status", async () => {
    const child = new FakeChild();
    const stderr = captureStream();
    const result = runProductionServer({
      cwd: root,
      spawn: () => child,
      stderr: stderr.stream,
      processSignals: new EventEmitter(),
    });

    child.emit("close", 7, null);

    await expect(result).resolves.toBe(7);
    expect(stderr.text()).toContain("Command exited with status 7");
    expect(stderr.text()).toContain("Failed command: pnpm start");
    expect(stderr.text()).toContain("Repair:");
    expect(
      readFileSync(join(root, "artifacts/application.log"), "utf8"),
    ).toContain("Command exited with status 7");
  });
});

import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildSetupCommands, runSetup } from "../../../scripts/setup";

describe("buildSetupCommands", () => {
  it("prepares the database and installs only Chromium locally", () => {
    expect(buildSetupCommands(false)).toEqual([
      { bin: "pnpm", args: ["db:setup"] },
      {
        bin: "pnpm",
        args: ["exec", "playwright", "install", "chromium"],
      },
    ]);
  });

  it("installs Chromium system dependencies in CI", () => {
    expect(buildSetupCommands(true)).toEqual([
      { bin: "pnpm", args: ["db:setup"] },
      {
        bin: "pnpm",
        args: ["exec", "playwright", "install", "--with-deps", "chromium"],
      },
    ]);
  });
});

describe("runSetup", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "agentic-coding-os-setup-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("does not create an absent .env or start any command", () => {
    const spawn = vi.fn();
    const errors: string[] = [];

    expect(
      runSetup({
        cwd: root,
        spawn,
        writeError: (message) => errors.push(message),
      }),
    ).toBe(1);

    expect(existsSync(join(root, ".env"))).toBe(false);
    expect(spawn).not.toHaveBeenCalled();
    expect(errors.join("")).toBe(
      "Create .env from .env.example before running pnpm run setup.\n",
    );
  });

  it("keeps an existing .env unchanged and uses the current pnpm executable", () => {
    const envPath = join(root, ".env");
    const existingEnv = "DATABASE_URL=postgresql://local-only\n";
    writeFileSync(envPath, existingEnv);
    const spawn = vi.fn(() => ({ status: 0, signal: null }));

    expect(
      runSetup({
        ci: false,
        cwd: root,
        spawn,
        npmExecPath: "/tools/pnpm.cjs",
        nodeExecPath: "/tools/node",
      }),
    ).toBe(0);

    expect(readFileSync(envPath, "utf8")).toBe(existingEnv);
    expect(spawn).toHaveBeenNthCalledWith(
      1,
      "/tools/node",
      ["/tools/pnpm.cjs", "db:setup"],
      { cwd: root, stdio: "inherit" },
    );
    expect(spawn).toHaveBeenNthCalledWith(
      2,
      "/tools/node",
      ["/tools/pnpm.cjs", "exec", "playwright", "install", "chromium"],
      { cwd: root, stdio: "inherit" },
    );
  });

  it("stops after the first failed command and prints repair guidance", () => {
    writeFileSync(join(root, ".env"), "LOCAL_ONLY=true\n");
    const spawn = vi.fn(() => ({ status: 2, signal: null }));
    const errors: string[] = [];

    expect(
      runSetup({
        cwd: root,
        spawn,
        npmExecPath: null,
        writeError: (message) => errors.push(message),
      }),
    ).toBe(2);

    expect(spawn).toHaveBeenCalledTimes(1);
    expect(spawn).toHaveBeenCalledWith("pnpm", ["db:setup"], {
      cwd: root,
      stdio: "inherit",
    });
    expect(errors.join("")).toContain("Failed command: pnpm db:setup\n");
    expect(errors.join("")).toContain(
      "Repair: resolve the reported problem, then rerun pnpm run setup.\n",
    );
  });

  it.each([
    {
      name: "a spawn error",
      result: {
        status: null,
        signal: null,
        error: new Error("spawn blocked"),
      },
      reason: "Could not start command: spawn blocked",
    },
    {
      name: "a signal",
      result: { status: null, signal: "SIGTERM" as NodeJS.Signals },
      reason: "Command stopped after signal SIGTERM",
    },
    {
      name: "a missing exit status",
      result: { status: null, signal: null },
      reason: "Command returned no exit status",
    },
  ])("handles $name", ({ result, reason }) => {
    writeFileSync(join(root, ".env"), "LOCAL_ONLY=true\n");
    const errors: string[] = [];

    expect(
      runSetup({
        cwd: root,
        spawn: () => result,
        writeError: (message) => errors.push(message),
      }),
    ).toBe(1);

    expect(errors.join("")).toContain(`${reason}\n`);
    expect(errors.join("")).toContain("Failed command: pnpm db:setup\n");
    expect(errors.join("")).toContain("Repair:");
  });
});

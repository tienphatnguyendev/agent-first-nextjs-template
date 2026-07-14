import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { prepareArtifacts } from "../../scripts/prepare-artifacts";
import { createCommandRunner, runVerification } from "../../scripts/verify";

describe("runVerification", () => {
  it("stops at the first failure and gives a repair command", () => {
    const calls: string[] = [];
    const runner = vi.fn((script: string) => {
      calls.push(script);
      return script === "lint" ? 1 : 0;
    });

    expect(() => runVerification(runner)).toThrow(
      "ESLint failed. Reproduce and repair it with: pnpm lint",
    );
    expect(calls).toEqual(["docs:check", "format:check", "lint"]);
  });

  it("runs the complete approved order", () => {
    const calls: string[] = [];
    runVerification((script) => {
      calls.push(script);
      return 0;
    });

    expect(calls).toEqual([
      "docs:check",
      "format:check",
      "lint",
      "architecture",
      "typecheck",
      "test:unit",
      "test:integration",
      "build",
      "test:e2e:run",
    ]);
  });
});

describe("createCommandRunner", () => {
  it("uses the active package-manager executable when it is available", () => {
    const spawn = vi.fn(() => ({ status: 0, signal: null }));
    const runner = createCommandRunner({
      spawn,
      npmExecPath: "/tools/pnpm.cjs",
      nodeExecPath: "/usr/bin/node",
    });

    expect(runner("docs:check")).toBe(0);
    expect(spawn).toHaveBeenCalledWith(
      "/usr/bin/node",
      ["/tools/pnpm.cjs", "docs:check"],
      { stdio: "inherit" },
    );
  });

  it("falls back to pnpm when no active package-manager path is available", () => {
    const spawn = vi.fn(() => ({ status: 0, signal: null }));
    const runner = createCommandRunner({
      spawn,
      npmExecPath: "",
      nodeExecPath: "/usr/bin/node",
    });

    expect(runner("docs:check")).toBe(0);
    expect(spawn).toHaveBeenCalledWith("pnpm", ["docs:check"], {
      stdio: "inherit",
    });
  });

  it.each([
    {
      name: "a spawn error",
      result: {
        status: null,
        signal: null,
        error: new Error("spawn blocked"),
      },
      reason: "the package manager could not start: spawn blocked",
    },
    {
      name: "a process signal",
      result: { status: null, signal: "SIGTERM" as const },
      reason: "the package manager stopped after signal SIGTERM",
    },
    {
      name: "a missing exit status",
      result: { status: null, signal: null },
      reason: "the package manager returned no exit status",
    },
  ])(
    "reports $name with the check repair instruction",
    ({ result, reason }) => {
      const runner = createCommandRunner({
        spawn: () => result,
        npmExecPath: "/tools/pnpm.cjs",
        nodeExecPath: "/usr/bin/node",
      });

      expect(() => runVerification(runner)).toThrow(
        `Documentation structure failed because ${reason}. ` +
          "Reproduce and repair it with: pnpm docs:check",
      );
    },
  );
});

describe("prepareArtifacts", () => {
  it("creates report directories when artifacts does not exist", () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "repository-artifacts-"));

    try {
      prepareArtifacts(repositoryRoot);

      expect(
        statSync(join(repositoryRoot, "artifacts/test-results")).isDirectory(),
      ).toBe(true);
      expect(
        statSync(join(repositoryRoot, "artifacts/playwright")).isDirectory(),
      ).toBe(true);
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("creates report directories without deleting existing evidence", () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "repository-artifacts-"));
    const existingReport = join(
      repositoryRoot,
      "artifacts/test-results/existing.xml",
    );

    try {
      mkdirSync(join(repositoryRoot, "artifacts/test-results"), {
        recursive: true,
      });
      writeFileSync(existingReport, "existing evidence");

      prepareArtifacts(repositoryRoot);

      expect(
        statSync(join(repositoryRoot, "artifacts/test-results")).isDirectory(),
      ).toBe(true);
      expect(
        statSync(join(repositoryRoot, "artifacts/playwright")).isDirectory(),
      ).toBe(true);
      expect(readFileSync(existingReport, "utf8")).toBe("existing evidence");
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });
});

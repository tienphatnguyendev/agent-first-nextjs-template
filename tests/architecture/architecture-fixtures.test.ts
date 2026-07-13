import { spawnSync } from "node:child_process";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const runner = path.join(
  repositoryRoot,
  "scripts/check-architecture-fixtures.ts",
);

function runFixture(name: string) {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", runner, "--fixture", name],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
    },
  );

  return {
    exitCode: result.status,
    output: `${result.stdout}${result.stderr}`,
  };
}

describe("architecture fixtures", () => {
  it("allows a module public index import", () => {
    const result = runFixture("valid-public-import");

    expect(result.exitCode, result.output).toBe(0);
  }, 20_000);

  it.each([
    ["app-private-import", "no-app-private-module-imports"],
    ["cross-module-private-import", "no-private-cross-module-imports"],
    ["domain-framework-import", "no-domain-framework-imports"],
    ["shared-platform-import", "no-shared-module-or-platform-imports"],
    ["client-server-import", "no-client-server-imports"],
  ])(
    "rejects %s with %s and repair guidance",
    (fixture, rule) => {
      const result = runFixture(fixture);

      expect(result.exitCode, result.output).not.toBe(0);
      expect(result.output).toContain(rule);
      expect(result.output).toContain("Repair:");
    },
    20_000,
  );
});

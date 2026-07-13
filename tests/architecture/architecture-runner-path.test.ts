import { spawnSync } from "node:child_process";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const runner = path.join(
  repositoryRoot,
  "scripts/check-architecture-fixtures.ts",
);

describe("architecture fixture runner command", () => {
  it("uses the repository dependency-cruiser when PATH has no local binaries", () => {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", runner, "--fixture", "valid-public-import"],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: { ...process.env, PATH: "/usr/bin:/bin" },
      },
    );
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

    expect(result.status, output).toBe(0);
    expect(output).toContain("no dependency violations found");
    expect(output).not.toContain("ERR_INVALID_ARG_TYPE");
  }, 20_000);
});

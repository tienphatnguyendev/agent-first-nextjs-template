import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { prepareStandaloneOutput } from "../../../scripts/prepare-standalone";

function createBuildFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "standalone-build-"));
  mkdirSync(join(root, "public", "images"), { recursive: true });
  mkdirSync(join(root, ".next", "static", "chunks"), { recursive: true });
  mkdirSync(join(root, ".next", "standalone"), { recursive: true });
  writeFileSync(join(root, "public", "images", "logo.svg"), "safe-logo");
  writeFileSync(
    join(root, ".next", "static", "chunks", "app.js"),
    "safe-chunk",
  );
  return root;
}

describe("prepareStandaloneOutput", () => {
  it("copies public and static files into the standalone server", () => {
    const root = createBuildFixture();

    try {
      prepareStandaloneOutput(root);

      expect(
        readFileSync(
          join(root, ".next", "standalone", "public", "images", "logo.svg"),
          "utf8",
        ),
      ).toBe("safe-logo");
      expect(
        readFileSync(
          join(
            root,
            ".next",
            "standalone",
            ".next",
            "static",
            "chunks",
            "app.js",
          ),
          "utf8",
        ),
      ).toBe("safe-chunk");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("removes stale copied output before it copies the current build", () => {
    const root = createBuildFixture();
    const staleFile = join(root, ".next", "standalone", "public", "stale.txt");
    mkdirSync(join(root, ".next", "standalone", "public"), {
      recursive: true,
    });
    writeFileSync(staleFile, "stale");

    try {
      prepareStandaloneOutput(root);

      expect(existsSync(staleFile)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports a missing build source with repair guidance", () => {
    const root = mkdtempSync(join(tmpdir(), "standalone-build-"));
    mkdirSync(join(root, ".next", "standalone"), { recursive: true });

    try {
      expect(() => prepareStandaloneOutput(root)).toThrow(
        "Standalone output is incomplete: missing public. " +
          "Repair: run pnpm run build and resolve the earlier Next.js error.",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

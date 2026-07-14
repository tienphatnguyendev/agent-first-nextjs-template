import { cpSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const requiredPaths = [
  "public",
  ".next/static",
  ".next/standalone/server.js",
] as const;

export function prepareStandaloneOutput(root = process.cwd()): void {
  for (const path of requiredPaths) {
    if (!existsSync(resolve(root, path))) {
      throw new Error(
        `Standalone output is incomplete: missing ${path}. ` +
          "Repair: run pnpm run build and resolve the earlier Next.js error.",
      );
    }
  }

  const copies = [
    {
      source: resolve(root, "public"),
      destination: resolve(root, ".next/standalone/public"),
    },
    {
      source: resolve(root, ".next/static"),
      destination: resolve(root, ".next/standalone/.next/static"),
    },
  ] as const;

  for (const copy of copies) {
    rmSync(copy.destination, { recursive: true, force: true });
    cpSync(copy.source, copy.destination, { recursive: true });
  }
}

const entrypoint = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entrypoint === fileURLToPath(import.meta.url)) {
  try {
    prepareStandaloneOutput();
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}

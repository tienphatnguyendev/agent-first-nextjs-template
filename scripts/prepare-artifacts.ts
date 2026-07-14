import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(import.meta.dirname, "..");

export function prepareArtifacts(root = repositoryRoot): void {
  mkdirSync(resolve(root, "artifacts/test-results"), { recursive: true });
  mkdirSync(resolve(root, "artifacts/playwright"), { recursive: true });
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  prepareArtifacts();
}

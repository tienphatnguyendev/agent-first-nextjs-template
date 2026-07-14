import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": path.join(root, "tests/setup/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    include: ["tests/integration/**/*.test.ts"],
    maxWorkers: 1,
    reporters: [
      "default",
      ["junit", { outputFile: "artifacts/test-results/integration.xml" }],
    ],
    setupFiles: ["tests/integration/setup.ts"],
  },
});

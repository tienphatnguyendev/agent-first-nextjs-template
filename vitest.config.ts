import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": path.join(root, "tests/setup/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/scripts/**/*.test.ts",
      "tests/architecture/**/*.test.ts",
      "tests/delivery/**/*.test.ts",
    ],
    setupFiles: ["tests/setup/vitest.ts"],
    reporters: [
      "default",
      ["junit", { outputFile: "artifacts/test-results/unit.xml" }],
    ],
  },
});

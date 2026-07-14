import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readRepositoryFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function workflowJob(workflow: string, name: string): string {
  const marker = `  ${name}:\n`;
  const start = workflow.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  const tail = workflow.slice(start + marker.length);
  const nextJob = tail.search(/\n  [a-z][a-z0-9_-]*:\n/i);
  return nextJob === -1 ? tail : tail.slice(0, nextJob);
}

function workflowStep(workflow: string, name: string): string {
  const marker = `      - name: ${name}\n`;
  const start = workflow.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  const tail = workflow.slice(start + marker.length);
  const nextStep = tail.indexOf("\n      - name:");
  return nextStep === -1 ? tail : tail.slice(0, nextStep);
}

describe("delivery configuration", () => {
  it("builds a non-root Node.js 24 standalone image", () => {
    const dockerfile = readRepositoryFile("Dockerfile");
    const stageDefinitions = [
      ...dockerfile.matchAll(/^FROM\s+(\S+)\s+AS\s+([a-z0-9_-]+)\s*$/gim),
    ].map((match) => ({ source: match[1], name: match[2] }));

    expect(stageDefinitions.length).toBeGreaterThanOrEqual(3);
    expect(stageDefinitions).toEqual([
      { source: "node:24-bookworm-slim", name: "base" },
      { source: "base", name: "dependencies" },
      { source: "base", name: "builder" },
      { source: "node:24-bookworm-slim", name: "runner" },
    ]);
    expect(dockerfile).toContain(
      "apt-get install -y --no-install-recommends openssl",
    );
    expect(dockerfile).toContain("rm -rf /var/lib/apt/lists/*");
    expect(dockerfile).toMatch(/^FROM\s+node:24-bookworm-slim\s+AS\s+runner$/m);
    expect(dockerfile).toContain("pnpm install --frozen-lockfile");
    expect(dockerfile).toContain(
      "DIRECT_URL=postgresql://build:build@127.0.0.1:5432/build pnpm run db:generate",
    );
    expect(dockerfile).toContain("pnpm run build");
    expect(dockerfile).toMatch(/^USER\s+nextjs$/m);
    expect(dockerfile).toMatch(/^HEALTHCHECK\b/m);
    expect(dockerfile).toContain("/app/.next/standalone ./");
    expect(dockerfile).not.toContain("/app/.next/static ./.next/static");
    expect(dockerfile).not.toContain("/app/public ./public");
    expect(dockerfile).toMatch(/^EXPOSE\s+3000$/m);
    expect(dockerfile).toContain("http://127.0.0.1:3000/api/health");
    expect(dockerfile).toMatch(/^CMD \["node", "server\.js"\]$/m);

    const runner = dockerfile.slice(
      dockerfile.indexOf("FROM node:24-bookworm-slim AS runner"),
    );
    const runnerCopies = runner.match(/^COPY\s+.*$/gm);
    expect(runnerCopies).toHaveLength(1);
    expect(runner).not.toContain("postgresql://");
    expect(runner).not.toContain("apt-get");
    expect(runner).not.toContain("openssl");
  });

  it("keeps secrets and environment files outside the image", () => {
    const dockerfile = readRepositoryFile("Dockerfile");
    const dockerignore = readRepositoryFile(".dockerignore");

    expect(dockerfile).not.toMatch(/^\s*COPY\s+.*\.env/m);
    expect(dockerfile).not.toMatch(
      /^\s*ARG\s+.*(?:DATABASE_URL|DIRECT_URL|PASSWORD|SECRET|TOKEN)/im,
    );
    expect(dockerfile.match(/postgres(?:ql)?:\/\/[^\s]+/g)).toEqual([
      "postgresql://build:build@127.0.0.1:5432/build",
    ]);
    for (const ignored of [
      ".git",
      ".superpowers",
      ".env*",
      "!.env.example",
      ".next",
      "node_modules",
      "artifacts",
      "playwright-report",
      "test-results",
      "supabase/.branches",
      "supabase/.temp",
    ]) {
      expect(dockerignore.split("\n")).toContain(ignored);
    }
  });

  it("runs repository-owned verification and container commands in CI", () => {
    const workflow = readRepositoryFile(".github/workflows/ci.yml");
    const verify = workflowJob(workflow, "verify");
    const container = workflowJob(workflow, "container");

    expect(workflow).toMatch(/on:\s*\n\s+pull_request:\s*\n\s+push:/);
    expect(workflow).toMatch(/push:\s*\n\s+branches:\s*\n\s+- main/);
    expect(workflow).toMatch(/concurrency:[\s\S]*cancel-in-progress:\s*true/);
    expect(verify).toMatch(/timeout-minutes:\s*30/);
    expect(container).toMatch(/needs:\s*verify/);
    expect(container).toMatch(/timeout-minutes:\s*20/);

    expect(workflow).toMatch(/node-version:\s*["']?24["']?/);
    expect(workflow.match(/node-version:\s*["']?24["']?/g)).toHaveLength(2);
    expect(workflow.match(/pnpm install --frozen-lockfile/g)).toHaveLength(2);
    expect(
      [...workflow.matchAll(/^\s*uses:\s*(\S+)$/gm)].every((match) =>
        /@v\d+$/.test(match[1] ?? ""),
      ),
    ).toBe(true);
    for (const job of [verify, container]) {
      const checkout = workflowStep(job, "Check out repository");
      expect(checkout).toContain("uses: actions/checkout@v4");
      expect(checkout).toContain("persist-credentials: false");
    }
    expect(verify).toContain("pnpm run artifacts:prepare");
    expect(verify).toContain("cp .env.example .env");
    expect(verify).toContain("set -o pipefail");
    expect(verify).toContain(
      "pnpm run setup 2>&1 | tee artifacts/supabase-start.log",
    );
    expect(verify).toContain("pnpm run verify");
    expect(container).toContain("pnpm run container:build");
    expect(container).toContain("pnpm run container:check");
    expect(workflow).not.toMatch(/\bpnpm setup\b/);
    expect(container).not.toMatch(/--build-arg|DATABASE_URL|DIRECT_URL/);
    expect(workflow).not.toMatch(/\b(?:deploy|publish|docker push)\b/i);
  });

  it("grants read-only access and uploads evidence only after failure", () => {
    const workflow = readRepositoryFile(".github/workflows/ci.yml");
    const uploadStep = workflowStep(workflow, "Upload failure evidence");

    expect(workflow).toMatch(/permissions:\s*\n\s+contents:\s*read/);
    expect(workflow).not.toMatch(/^\s+[a-z-]+:\s*write\s*$/m);
    expect(workflow.match(/actions\/upload-artifact@v4/g)).toHaveLength(1);
    expect(uploadStep).toContain("if: failure()");
    expect(uploadStep).toContain("uses: actions/upload-artifact@v4");
    expect(uploadStep).toContain("name: verification-artifacts");
    expect(uploadStep).toContain("path: artifacts/");
    expect(uploadStep).toContain("retention-days: 14");
  });

  it("enables standalone output and exposes stable container scripts", () => {
    const nextConfig = readRepositoryFile("next.config.ts");
    const packageJson = JSON.parse(
      readRepositoryFile("package.json"),
    ) as Record<string, { [key: string]: string }>;

    expect(nextConfig).toContain('output: "standalone"');
    expect(packageJson.scripts?.["container:build"]).toBe(
      "docker build --target runner --tag agentic-coding-os:ci .",
    );
    expect(packageJson.scripts?.["container:check"]).toBe(
      "node --import tsx scripts/check-container.ts agentic-coding-os:ci",
    );
    expect(packageJson.scripts?.postbuild).toBe(
      "node --import tsx scripts/prepare-standalone.ts",
    );
    expect(packageJson.scripts?.start).toBe("node .next/standalone/server.js");
    expect(packageJson.devDependencies?.["@types/node"]).toBe("^24.13.1");
  });
});

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkSymphonyReadiness,
  runSymphonyReadiness,
  type CommandResult,
  type RunCommand,
} from "../../../scripts/check-symphony";

const pinnedRevision = "4cbe3a9699a73b862466c0b157ceca0c1985d6d7";
const repository = "tienphatnguyendev/agent-first-nextjs-template";
const apiKey = "linear-api-key-that-must-stay-private";
const projectSlug = "linear-project-slug-that-must-stay-private";

const validProtection = {
  required_status_checks: {
    strict: true,
    contexts: ["Verify foundation", "Build secure container"],
  },
  enforce_admins: { enabled: true },
  required_pull_request_reviews: {},
  allow_force_pushes: { enabled: false },
  allow_deletions: { enabled: false },
};

const validWorkflow = `---
tracker:
  kind: linear
  api_key: $LINEAR_API_KEY
  project_slug: $LINEAR_PROJECT_SLUG
  required_labels:
    - symphony
  active_states:
    - Todo
    - In Progress
    - Rework
  terminal_states:
    - Done
    - Closed
    - Cancelled
    - Duplicate
polling:
  interval_ms: 30000
server:
  port: 4000
workspace:
  root: ~/code/symphony-workspaces
hooks:
  after_create: |
    git clone --depth 1 https://github.com/${repository}.git .
    test -e .env || cp .env.example .env
    pnpm install --frozen-lockfile
  before_run: pnpm run setup
  after_run: pnpm exec supabase stop --no-backup
  before_remove: pnpm exec supabase stop --no-backup
  timeout_ms: 1200000
agent:
  max_concurrent_agents: 1
codex:
  command: codex --config shell_environment_policy.inherit=core app-server
  approval_policy: never
  thread_sandbox: workspace-write
  turn_sandbox_policy:
    type: workspaceWrite
    networkAccess: true
---
Work only on the supplied issue.
`;

const success = (stdout = ""): CommandResult => ({
  status: 0,
  signal: null,
  stdout,
  stderr: "",
});

function commandKey(command: string, args: readonly string[]): string {
  return [command, ...args].join(" ");
}

function createCommandRunner(
  overrides: Readonly<Record<string, CommandResult>> = {},
): RunCommand {
  const defaults: Readonly<Record<string, CommandResult>> = {
    "codex --version": success("codex 1.0.0\n"),
    "mise --version": success("mise 1.0.0\n"),
    "docker --version": success("Docker version 1.0.0\n"),
    "gh --version": success("gh version 1.0.0\n"),
    "pnpm --version": success("10.18.0\n"),
    [`git -C /Users/tester/code/openai-symphony rev-parse HEAD`]: success(
      `${pinnedRevision}\n`,
    ),
    "gh auth status": success("authenticated\n"),
    [`gh api repos/${repository}/branches/main/protection`]: success(
      JSON.stringify(validProtection),
    ),
    "docker ps --filter name=^/supabase_db_agentic-coding-os$ --filter status=running --format {{.Names}}":
      success(),
  };

  return vi.fn(async (command, args) => {
    const key = commandKey(command, args);
    return overrides[key] ?? defaults[key] ?? success();
  });
}

describe("checkSymphonyReadiness", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "agentic-coding-os-symphony-"));
    writeFileSync(join(root, "WORKFLOW.md"), validWorkflow);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function options(runCommand: RunCommand = createCommandRunner()) {
    return {
      cwd: root,
      homeDir: "/Users/tester",
      env: {
        LINEAR_API_KEY: apiKey,
        LINEAR_PROJECT_SLUG: projectSlug,
      },
      runCommand,
    } as const;
  }

  it("accepts the complete safe pilot configuration and host state", async () => {
    await expect(checkSymphonyReadiness(options())).resolves.toEqual([]);
  });

  it("reports a missing workflow", async () => {
    rmSync(join(root, "WORKFLOW.md"));

    const issues = await checkSymphonyReadiness(options());

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "missing-workflow" }),
    );
  });

  it("reports invalid YAML front matter", async () => {
    writeFileSync(join(root, "WORKFLOW.md"), "---\ntracker: [\n---\nprompt\n");

    const issues = await checkSymphonyReadiness(options());

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "invalid-workflow" }),
    );
  });

  it.each([
    ["tracker kind", "kind: linear", "kind: github"],
    ["API key indirection", "api_key: $LINEAR_API_KEY", "api_key: literal"],
    [
      "project slug indirection",
      "project_slug: $LINEAR_PROJECT_SLUG",
      "project_slug: literal",
    ],
    ["dispatch label", "- symphony", "- unrestricted"],
    ["active states", "    - Rework\n", "    - Human Review\n"],
    ["terminal states", "    - Duplicate\n", "    - Human Review\n"],
    ["poll interval", "interval_ms: 30000", "interval_ms: 5000"],
    ["dashboard port", "port: 4000", "port: 4001"],
    [
      "workspace root",
      "root: ~/code/symphony-workspaces",
      "root: /tmp/symphony",
    ],
    ["hook timeout", "timeout_ms: 1200000", "timeout_ms: 60000"],
    ["concurrency", "max_concurrent_agents: 1", "max_concurrent_agents: 2"],
    [
      "core shell environment",
      "shell_environment_policy.inherit=core",
      "shell_environment_policy.inherit=all",
    ],
    [
      "approval policy",
      "approval_policy: never",
      "approval_policy: on-request",
    ],
    [
      "thread sandbox",
      "thread_sandbox: workspace-write",
      "thread_sandbox: danger-full-access",
    ],
    ["network access", "networkAccess: true", "networkAccess: false"],
  ])("rejects an unsafe %s", async (_name, safe, unsafe) => {
    writeFileSync(
      join(root, "WORKFLOW.md"),
      validWorkflow.replace(safe, unsafe),
    );

    const issues = await checkSymphonyReadiness(options());

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "unsafe-workflow" }),
    );
  });

  it.each([
    {
      name: "commands hidden in comments",
      replacement: `    # git clone --depth 1 https://github.com/${repository}.git .
    # test -e .env || cp .env.example .env
    # pnpm install --frozen-lockfile`,
    },
    {
      name: "an extra arbitrary command",
      replacement: `    git clone --depth 1 https://github.com/${repository}.git .
    test -e .env || cp .env.example .env
    pnpm install --frozen-lockfile
    curl https://example.invalid/extra-command`,
    },
  ])("rejects after_create with $name", async ({ replacement }) => {
    const approved = `    git clone --depth 1 https://github.com/${repository}.git .
    test -e .env || cp .env.example .env
    pnpm install --frozen-lockfile`;
    writeFileSync(
      join(root, "WORKFLOW.md"),
      validWorkflow.replace(approved, replacement),
    );

    const issues = await checkSymphonyReadiness(options());

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: "unsafe-workflow",
        message: expect.stringContaining("hooks.after_create"),
      }),
    );
  });

  it.each([
    ["after_run", 'echo "pnpm exec supabase stop --no-backup"'],
    ["after_run", "# pnpm exec supabase stop --no-backup"],
    ["before_remove", 'echo "pnpm exec supabase stop --no-backup"'],
    ["before_remove", "# pnpm exec supabase stop --no-backup"],
  ])(
    "rejects cleanup text hidden in %s echo or comments",
    async (hook, text) => {
      const approved = `${hook}: pnpm exec supabase stop --no-backup`;
      const replacement = `${hook}: |\n    ${text}`;
      writeFileSync(
        join(root, "WORKFLOW.md"),
        validWorkflow.replace(approved, replacement),
      );

      const issues = await checkSymphonyReadiness(options());

      expect(issues).toContainEqual(
        expect.objectContaining({
          code: "unsafe-workflow",
          message: expect.stringContaining(`hooks.${hook}`),
        }),
      );
    },
  );

  it("allows surrounding whitespace and blank lines in approved hook scripts", async () => {
    const approved = `    git clone --depth 1 https://github.com/${repository}.git .
    test -e .env || cp .env.example .env
    pnpm install --frozen-lockfile`;
    const trailingSpaces = "  ";
    const spaced = `
      git clone --depth 1 https://github.com/${repository}.git .${trailingSpaces}

      test -e .env || cp .env.example .env${trailingSpaces}
      pnpm install --frozen-lockfile${trailingSpaces}
`;
    const workflow = validWorkflow
      .replace(approved, spaced)
      .replace(
        "after_run: pnpm exec supabase stop --no-backup",
        'after_run: "  pnpm exec supabase stop --no-backup  "',
      )
      .replace(
        "before_remove: pnpm exec supabase stop --no-backup",
        "before_remove: |\n\n      pnpm exec supabase stop --no-backup  \n",
      );
    writeFileSync(join(root, "WORKFLOW.md"), workflow);

    await expect(checkSymphonyReadiness(options())).resolves.toEqual([]);
  });

  it("reports absent Linear environment variables without disclosing values", async () => {
    const issues = await checkSymphonyReadiness({
      ...options(),
      env: {
        UNRELATED_SECRET: "unrelated-value-that-must-stay-private",
      },
    });
    const output = issues.map((issue) => issue.message).join("\n");

    expect(output).toContain("LINEAR_API_KEY");
    expect(output).toContain("LINEAR_PROJECT_SLUG");
    expect(output).not.toContain(apiKey);
    expect(output).not.toContain(projectSlug);
    expect(output).not.toContain("unrelated-value-that-must-stay-private");
  });

  it.each(["codex", "mise", "docker", "gh", "pnpm"])(
    "reports a missing %s tool",
    async (tool) => {
      const missing: CommandResult = {
        status: null,
        signal: null,
        stdout: "",
        stderr: "",
        error: new Error("spawn ENOENT private-path"),
      };
      const issues = await checkSymphonyReadiness(
        options(createCommandRunner({ [`${tool} --version`]: missing })),
      );

      expect(issues).toContainEqual(
        expect.objectContaining({ code: "missing-tool" }),
      );
      expect(issues.map((issue) => issue.message).join("\n")).toContain(tool);
      expect(issues.map((issue) => issue.message).join("\n")).not.toContain(
        "private-path",
      );
    },
  );

  it("rejects a Symphony checkout at the wrong revision", async () => {
    const issues = await checkSymphonyReadiness(
      options(
        createCommandRunner({
          "git -C /Users/tester/code/openai-symphony rev-parse HEAD": success(
            "0000000000000000000000000000000000000000\n",
          ),
        }),
      ),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "wrong-symphony-revision" }),
    );
  });

  it("reports failed GitHub authentication without forwarding command output", async () => {
    const issues = await checkSymphonyReadiness(
      options(
        createCommandRunner({
          "gh auth status": {
            status: 1,
            signal: null,
            stdout: "",
            stderr: "token private-gh-token is invalid",
          },
        }),
      ),
    );
    const output = issues.map((issue) => issue.message).join("\n");

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "github-authentication" }),
    );
    expect(output).not.toContain("private-gh-token");
  });

  it("reports missing branch protection", async () => {
    const issues = await checkSymphonyReadiness(
      options(
        createCommandRunner({
          [`gh api repos/${repository}/branches/main/protection`]: {
            status: 404,
            signal: null,
            stdout: "",
            stderr: "not found",
          },
        }),
      ),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "branch-protection" }),
    );
  });

  it.each([
    ["Build secure container", ["Verify foundation"]],
    ["Verify foundation", ["Build secure container"]],
  ])("reports a missing %s CI context", async (missingContext, contexts) => {
    const protection = {
      ...validProtection,
      required_status_checks: {
        strict: true,
        contexts,
      },
    };
    const issues = await checkSymphonyReadiness(
      options(
        createCommandRunner({
          [`gh api repos/${repository}/branches/main/protection`]: success(
            JSON.stringify(protection),
          ),
        }),
      ),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: "missing-ci-context",
        message: expect.stringContaining(missingContext),
      }),
    );
  });

  it("rejects an already-running shared Supabase container", async () => {
    const issues = await checkSymphonyReadiness(
      options(
        createCommandRunner({
          "docker ps --filter name=^/supabase_db_agentic-coding-os$ --filter status=running --format {{.Names}}":
            success("supabase_db_agentic-coding-os\n"),
        }),
      ),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "shared-supabase-running" }),
    );
  });

  it("returns only issues with stable code and message strings", async () => {
    rmSync(join(root, "WORKFLOW.md"));

    const issues = await checkSymphonyReadiness(options());

    expect(issues.length).toBeGreaterThan(0);
    for (const issue of issues) {
      expect(issue).toEqual({
        code: expect.any(String),
        message: expect.any(String),
      });
    }
  });
});

describe("runSymphonyReadiness", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "agentic-coding-os-symphony-cli-"));
    writeFileSync(join(root, "WORKFLOW.md"), validWorkflow);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function baseOptions() {
    return {
      cwd: root,
      homeDir: "/Users/tester",
      env: {
        LINEAR_API_KEY: apiKey,
        LINEAR_PROJECT_SLUG: projectSlug,
      },
      runCommand: createCommandRunner(),
    } as const;
  }

  it("prints a short confirmation and returns zero when ready", async () => {
    const output: string[] = [];
    const errors: string[] = [];

    await expect(
      runSymphonyReadiness({
        ...baseOptions(),
        writeOutput: (message) => output.push(message),
        writeError: (message) => errors.push(message),
      }),
    ).resolves.toBe(0);

    expect(output.join("")).toBe("Symphony pilot readiness checks passed.\n");
    expect(errors).toEqual([]);
  });

  it("prints concise issues and repair guidance, then returns one", async () => {
    rmSync(join(root, "WORKFLOW.md"));
    const errors: string[] = [];

    await expect(
      runSymphonyReadiness({
        ...baseOptions(),
        writeOutput: vi.fn(),
        writeError: (message) => errors.push(message),
      }),
    ).resolves.toBe(1);

    expect(errors.join("")).toContain("missing-workflow:");
    expect(errors.join("")).toContain("Repair:");
    expect(errors.join("")).not.toContain(apiKey);
    expect(errors.join("")).not.toContain(projectSlug);
  });
});

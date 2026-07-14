import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";

export interface ReadinessIssue {
  readonly code: string;
  readonly message: string;
}

export interface CommandResult {
  readonly status: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly error?: Error;
}

export type RunCommand = (
  command: string,
  args: readonly string[],
) => Promise<CommandResult>;

export interface SymphonyReadinessOptions {
  readonly cwd?: string;
  readonly homeDir?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly runCommand?: RunCommand;
  readonly writeOutput?: (message: string) => void;
  readonly writeError?: (message: string) => void;
}

const pinnedRevision = "4cbe3a9699a73b862466c0b157ceca0c1985d6d7";
const repository = "tienphatnguyendev/agent-first-nextjs-template";
const linearProjectSlug = "agentic-coding-os-0d02fd16cb9c";
const requiredCiContexts = [
  "Verify foundation",
  "Build secure container",
] as const;
const sharedSupabaseContainer = "supabase_db_agentic-coding-os";

const toolCommands = [
  ["codex", ["--version"]],
  ["mise", ["--version"]],
  ["docker", ["--version"]],
  ["gh", ["--version"]],
  ["pnpm", ["--version"]],
] as const;

export function withoutLinearApiKey(
  environment: Readonly<Record<string, string | undefined>>,
): Record<string, string | undefined> {
  const childEnvironment = { ...environment };
  delete childEnvironment.LINEAR_API_KEY;
  return childEnvironment;
}

const executeCommand: RunCommand = (command, args) =>
  new Promise((done) => {
    execFile(
      command,
      [...args],
      {
        encoding: "utf8",
        env: withoutLinearApiKey(process.env) as NodeJS.ProcessEnv,
      },
      (error, stdout, stderr) => {
        const processError = error as NodeJS.ErrnoException & {
          readonly code?: string | number;
          readonly signal?: NodeJS.Signals;
        };
        const numericStatus =
          typeof processError?.code === "number" ? processError.code : null;

        done({
          status: error ? numericStatus : 0,
          signal: processError?.signal ?? null,
          stdout,
          stderr,
          ...(error ? { error } : {}),
        });
      },
    );
  });

function issue(code: string, message: string): ReadinessIssue {
  return { code, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nestedValue(
  root: Record<string, unknown>,
  ...path: readonly string[]
): unknown {
  let current: unknown = root;
  for (const part of path) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
}

function hasExactStrings(value: unknown, expected: readonly string[]): boolean {
  if (
    !Array.isArray(value) ||
    value.length !== expected.length ||
    !value.every((item): item is string => typeof item === "string")
  ) {
    return false;
  }

  const actual = new Set(value);
  return (
    actual.size === expected.length &&
    expected.every((item) => actual.has(item))
  );
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value);
  return (
    actual.length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key))
  );
}

function hasExactCommandLines(
  value: unknown,
  expected: readonly string[],
): boolean {
  if (typeof value !== "string") return false;

  const actual = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return (
    actual.length === expected.length &&
    expected.every((command, index) => actual[index] === command)
  );
}

function parseWorkflow(source: string): {
  readonly config: Record<string, unknown>;
  readonly prompt: string;
} {
  const lines = source.split(/\r?\n/);
  if (lines[0] !== "---") {
    throw new Error("YAML front matter is required");
  }

  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line === "---",
  );
  if (closingIndex < 0) {
    throw new Error("YAML front matter has no closing delimiter");
  }

  const document = parseDocument(lines.slice(1, closingIndex).join("\n"), {
    prettyErrors: false,
    strict: true,
    uniqueKeys: true,
  });
  if (document.errors.length > 0) {
    throw new Error("YAML front matter is invalid");
  }

  const config: unknown = document.toJS({ maxAliasCount: 0 });
  if (!isRecord(config)) {
    throw new Error("YAML front matter must contain an object");
  }

  return {
    config,
    prompt: lines
      .slice(closingIndex + 1)
      .join("\n")
      .trim(),
  };
}

function validateWorkflow(config: Record<string, unknown>): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  const requireValue = (
    path: readonly string[],
    valid: (value: unknown) => boolean,
    expected: string,
  ): void => {
    if (!valid(nestedValue(config, ...path))) {
      issues.push(
        issue(
          "unsafe-workflow",
          `WORKFLOW.md must set ${path.join(".")} to ${expected}.`,
        ),
      );
    }
  };

  requireValue(["tracker", "kind"], (value) => value === "linear", '"linear"');
  requireValue(
    ["tracker", "api_key"],
    (value) => value === "$LINEAR_API_KEY",
    '"$LINEAR_API_KEY"',
  );
  requireValue(
    ["tracker", "project_slug"],
    (value) => value === linearProjectSlug,
    `"${linearProjectSlug}"`,
  );
  requireValue(
    ["tracker", "required_labels"],
    (value) => hasExactStrings(value, ["symphony"]),
    '["symphony"]',
  );
  requireValue(
    ["tracker", "active_states"],
    (value) => hasExactStrings(value, ["Todo", "In Progress", "Rework"]),
    '["Todo", "In Progress", "Rework"]',
  );
  requireValue(
    ["tracker", "terminal_states"],
    (value) =>
      hasExactStrings(value, [
        "Done",
        "Closed",
        "Cancelled",
        "Canceled",
        "Duplicate",
      ]),
    '["Done", "Closed", "Cancelled", "Canceled", "Duplicate"]',
  );
  requireValue(
    ["polling", "interval_ms"],
    (value) => value === 30_000,
    "30000",
  );
  requireValue(
    ["server", "host"],
    (value) => value === "127.0.0.1",
    '"127.0.0.1"',
  );
  requireValue(["server", "port"], (value) => value === 4_000, "4000");
  requireValue(
    ["workspace", "root"],
    (value) => value === "~/code/symphony-workspaces",
    '"~/code/symphony-workspaces"',
  );
  requireValue(
    ["hooks", "after_create"],
    (value) =>
      hasExactCommandLines(value, [
        "unset LINEAR_API_KEY",
        `git clone --depth 1 https://github.com/${repository}.git .`,
        "test -e .env || cp .env.example .env",
        "pnpm install --frozen-lockfile",
      ]),
    "the approved credential unset, shallow clone, guarded .env copy, and locked install commands",
  );
  requireValue(
    ["hooks", "before_run"],
    (value) =>
      typeof value === "string" &&
      value.trim() === "env -u LINEAR_API_KEY pnpm run setup",
    '"env -u LINEAR_API_KEY pnpm run setup"',
  );
  for (const hook of ["after_run", "before_remove"] as const) {
    requireValue(
      ["hooks", hook],
      (value) =>
        hasExactCommandLines(value, [
          "env -u LINEAR_API_KEY pnpm exec supabase stop --no-backup",
        ]),
      '"env -u LINEAR_API_KEY pnpm exec supabase stop --no-backup"',
    );
  }
  requireValue(
    ["hooks", "timeout_ms"],
    (value) => value === 1_200_000,
    "1200000",
  );
  requireValue(["agent", "max_concurrent_agents"], (value) => value === 1, "1");
  requireValue(
    ["codex", "command"],
    (value) =>
      typeof value === "string" &&
      value.trim() ===
        "env -u LINEAR_API_KEY codex --config shell_environment_policy.inherit=core app-server",
    '"env -u LINEAR_API_KEY codex --config shell_environment_policy.inherit=core app-server"',
  );
  requireValue(
    ["codex", "approval_policy"],
    (value) => value === "never",
    '"never"',
  );
  requireValue(
    ["codex", "thread_sandbox"],
    (value) => value === "workspace-write",
    '"workspace-write"',
  );
  requireValue(
    ["codex", "turn_sandbox_policy"],
    (value) =>
      isRecord(value) &&
      hasExactKeys(value, ["type", "networkAccess"]) &&
      value.type === "workspaceWrite" &&
      value.networkAccess === true,
    'exactly { type: "workspaceWrite", networkAccess: true }',
  );

  return issues;
}

const promptRequirements: readonly {
  readonly behavior: string;
  readonly clause: string;
}[] = [
  {
    behavior: "repository guidance before file changes",
    clause:
      "Read `AGENTS.md`, `README.md`, `ARCHITECTURE.md`, and all repository guidance linked from them before you change files.",
  },
  {
    behavior: "exactly one Linear workpad",
    clause:
      "Maintain one Linear workpad comment for the issue. Create it if none exists. Update that same comment with your plan, progress, test results, branch, pull request, CI evidence, and blockers. Do not create a second workpad comment.",
  },
  {
    behavior: "resuming Rework with review feedback",
    clause:
      "If it is in `Rework`, resume from the existing workspace, branch, workpad, and pull request. Read the review feedback, record the new plan in the workpad, and then move the issue to `In Progress`.",
  },
  {
    behavior: "test-driven RED and minimal GREEN evidence",
    clause:
      "Use test-driven development. Add a focused failing test first, run it, and confirm that it fails for the expected reason. Then make the smallest change that passes the test. Keep the RED and GREEN evidence in the workpad.",
  },
  {
    behavior: "focused checks before pnpm verify",
    clause:
      "Run focused checks while you work. Run `pnpm verify` after the focused checks pass. Record the exact commands and results in the workpad.",
  },
  {
    behavior: "feature branch delivery without main pushes",
    clause:
      "Work only on a feature branch for this issue. Commit the verified change, push that feature branch, and open or update its pull request. Never push directly to `main`.",
  },
  {
    behavior: "both named CI checks with evidence",
    clause:
      "Confirm the pull request has passing `Verify foundation` and `Build secure container` checks. Add their CI evidence to the workpad.",
  },
  {
    behavior: "Human Review only after final evidence",
    clause:
      "Move the issue to `Human Review` only after the pull request exists, both CI checks pass, and the workpad contains the final evidence.",
  },
  {
    behavior: "safe blocker handling",
    clause:
      "If a blocker prevents safe progress, keep the issue out of `Human Review` and `Done`. Record the blocker and the required operator action under blockers in the workpad. Do not weaken a safety control.",
  },
  {
    behavior: "human-only merge and completion",
    clause:
      "Never merge a pull request. Never mark the issue `Done`. A human reviews, merges, and completes the issue.",
  },
];

function normalizePromptWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function validatePrompt(prompt: string): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  const normalizedPrompt = normalizePromptWhitespace(prompt);
  for (const requirement of promptRequirements) {
    if (
      !normalizedPrompt.includes(normalizePromptWhitespace(requirement.clause))
    ) {
      issues.push(
        issue(
          "unsafe-workflow",
          `WORKFLOW.md prompt must require ${requirement.behavior}.`,
        ),
      );
    }
  }
  return issues;
}

async function safelyRun(
  runCommand: RunCommand,
  command: string,
  args: readonly string[],
): Promise<CommandResult> {
  try {
    return await runCommand(command, args);
  } catch {
    return {
      status: null,
      signal: null,
      stdout: "",
      stderr: "",
      error: new Error("command failed"),
    };
  }
}

function commandSucceeded(result: CommandResult): boolean {
  return !result.error && !result.signal && result.status === 0;
}

function protectionIssues(result: CommandResult): ReadinessIssue[] {
  if (!commandSucceeded(result)) {
    return [
      issue(
        "branch-protection",
        `GitHub branch protection must exist for ${repository} main.`,
      ),
    ];
  }

  let protection: unknown;
  try {
    protection = JSON.parse(result.stdout);
  } catch {
    return [
      issue(
        "branch-protection",
        "GitHub returned invalid branch-protection data for main.",
      ),
    ];
  }

  if (!isRecord(protection)) {
    return [
      issue(
        "branch-protection",
        "GitHub returned invalid branch-protection data for main.",
      ),
    ];
  }

  const issues: ReadinessIssue[] = [];
  const pullRequestReviews = protection.required_pull_request_reviews;
  const enforceAdmins = protection.enforce_admins;
  const allowForcePushes = protection.allow_force_pushes;
  const allowDeletions = protection.allow_deletions;
  if (
    !isRecord(pullRequestReviews) ||
    !isRecord(enforceAdmins) ||
    enforceAdmins.enabled !== true ||
    !isRecord(allowForcePushes) ||
    allowForcePushes.enabled !== false ||
    !isRecord(allowDeletions) ||
    allowDeletions.enabled !== false
  ) {
    issues.push(
      issue(
        "branch-protection",
        "Protect main with pull requests, administrator enforcement, and blocked force pushes and deletion.",
      ),
    );
  }

  const statusChecks = protection.required_status_checks;
  const configuredContexts = new Set<string>();
  if (isRecord(statusChecks)) {
    if (Array.isArray(statusChecks.contexts)) {
      for (const context of statusChecks.contexts) {
        if (typeof context === "string") configuredContexts.add(context);
      }
    }
    if (Array.isArray(statusChecks.checks)) {
      for (const check of statusChecks.checks) {
        if (isRecord(check) && typeof check.context === "string") {
          configuredContexts.add(check.context);
        }
      }
    }
  }
  for (const context of requiredCiContexts) {
    if (!configuredContexts.has(context)) {
      issues.push(
        issue(
          "missing-ci-context",
          `GitHub main protection must require CI context "${context}".`,
        ),
      );
    }
  }

  return issues;
}

export async function checkSymphonyReadiness(
  options: SymphonyReadinessOptions = {},
): Promise<readonly ReadinessIssue[]> {
  const cwd = options.cwd ?? process.cwd();
  const homeDir = options.homeDir ?? homedir();
  const environment = options.env ?? process.env;
  const runCommand = options.runCommand ?? executeCommand;
  const issues: ReadinessIssue[] = [];

  try {
    const workflow = parseWorkflow(
      await readFile(resolve(cwd, "WORKFLOW.md"), "utf8"),
    );
    issues.push(...validateWorkflow(workflow.config));
    issues.push(...validatePrompt(workflow.prompt));
  } catch (error) {
    const fileError = error as NodeJS.ErrnoException;
    if (fileError.code === "ENOENT") {
      issues.push(
        issue(
          "missing-workflow",
          "Create the repository-root WORKFLOW.md before starting Symphony.",
        ),
      );
    } else {
      issues.push(
        issue(
          "invalid-workflow",
          "WORKFLOW.md must contain valid YAML front matter with the approved pilot settings.",
        ),
      );
    }
  }

  if (!environment.LINEAR_API_KEY?.trim()) {
    issues.push(
      issue(
        "missing-environment",
        "Set LINEAR_API_KEY in the Symphony process environment.",
      ),
    );
  }

  const toolResults = await Promise.all(
    toolCommands.map(async ([tool, args]) => ({
      tool,
      result: await safelyRun(runCommand, tool, args),
    })),
  );
  const availableTools = new Set<string>();
  for (const { tool, result } of toolResults) {
    if (commandSucceeded(result)) {
      availableTools.add(tool);
    } else {
      issues.push(
        issue("missing-tool", `Install ${tool} and make it available on PATH.`),
      );
    }
  }

  const checkout = join(homeDir, "code", "openai-symphony");
  const revisionResult = await safelyRun(runCommand, "git", [
    "-C",
    checkout,
    "rev-parse",
    "HEAD",
  ]);
  if (!commandSucceeded(revisionResult)) {
    issues.push(
      issue(
        "symphony-checkout",
        `Clone OpenAI Symphony into ${checkout} at the approved revision.`,
      ),
    );
  } else if (revisionResult.stdout.trim() !== pinnedRevision) {
    issues.push(
      issue(
        "wrong-symphony-revision",
        `Check out OpenAI Symphony revision ${pinnedRevision}.`,
      ),
    );
  }

  if (availableTools.has("gh")) {
    const authResult = await safelyRun(runCommand, "gh", ["auth", "status"]);
    if (!commandSucceeded(authResult)) {
      issues.push(
        issue(
          "github-authentication",
          "Authenticate GitHub CLI with access to the pilot repository.",
        ),
      );
    } else {
      const protectionResult = await safelyRun(runCommand, "gh", [
        "api",
        `repos/${repository}/branches/main/protection`,
      ]);
      issues.push(...protectionIssues(protectionResult));
    }
  }

  if (availableTools.has("docker")) {
    const containerResult = await safelyRun(runCommand, "docker", [
      "ps",
      "--filter",
      `name=^/${sharedSupabaseContainer}$`,
      "--filter",
      "status=running",
      "--format",
      "{{.Names}}",
    ]);
    if (!commandSucceeded(containerResult)) {
      issues.push(
        issue(
          "docker-unavailable",
          "Start Docker and confirm it can list local containers.",
        ),
      );
    } else if (
      containerResult.stdout
        .split(/\r?\n/)
        .map((name) => name.trim())
        .includes(sharedSupabaseContainer)
    ) {
      issues.push(
        issue(
          "shared-supabase-running",
          `Stop ${sharedSupabaseContainer} before starting Symphony.`,
        ),
      );
    }
  }

  return issues;
}

export async function runSymphonyReadiness(
  options: SymphonyReadinessOptions = {},
): Promise<number> {
  const writeOutput =
    options.writeOutput ?? ((message: string) => process.stdout.write(message));
  const writeError =
    options.writeError ?? ((message: string) => process.stderr.write(message));
  const issues = await checkSymphonyReadiness(options);

  if (issues.length === 0) {
    writeOutput("Symphony pilot readiness checks passed.\n");
    return 0;
  }

  for (const readinessIssue of issues) {
    writeError(`${readinessIssue.code}: ${readinessIssue.message}\n`);
  }
  writeError(
    "Repair: correct the reported workflow, environment, tool, authentication, protection, and local-container problems, then rerun pnpm symphony:check.\n",
  );
  return 1;
}

const entrypoint = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entrypoint === fileURLToPath(import.meta.url)) {
  runSymphonyReadiness()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch(() => {
      process.stderr.write(
        "Symphony readiness checks stopped unexpectedly.\n" +
          "Repair: resolve the local command failure, then rerun pnpm symphony:check.\n",
      );
      process.exitCode = 1;
    });
}

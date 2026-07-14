# OpenAI Symphony Local Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe, repository-owned OpenAI Symphony workflow and prove it with a local, three-issue Linear pilot.

**Architecture:** Run OpenAI's pinned Elixir reference implementation as an external local service. Keep the repository contract in `WORKFLOW.md`, add a read-only readiness command, and keep Symphony out of the Next.js application, production container, and CI runtime.

**Tech Stack:** Node.js 24, TypeScript 5, pnpm 10, Vitest 4, YAML, Codex App Server, OpenAI Symphony Elixir, Linear, GitHub CLI, Docker, and local Supabase.

## Global Constraints

- Pin OpenAI Symphony to commit `4cbe3a9699a73b862466c0b157ceca0c1985d6d7`.
- Use Linear workspace `Agentic Coding OS`, team and project `Symphony Pilot`, team key `SYM`, and required label `symphony`.
- Treat `Todo`, `In Progress`, and `Rework` as active; `Human Review` as non-active and non-terminal; and `Done`, `Closed`, `Cancelled`, and `Duplicate` as terminal.
- Use `~/code/openai-symphony` for the external checkout, `~/code/symphony-workspaces` for issue workspaces, and `127.0.0.1:4000` for the dashboard.
- Limit Symphony to one concurrent agent because every checkout shares the same Supabase ports and project identifier.
- Run `pnpm run setup` before agent work and stop Supabase after each run and before workspace deletion.
- Use Codex `workspace-write`, network access, `approval_policy: never`, and a core shell environment with default secret filtering.
- Require pull requests and both GitHub CI jobs; never merge automatically or push directly to `main`.
- Keep `LINEAR_API_KEY` and `LINEAR_PROJECT_SLUG` in the Symphony process environment only. Never print or commit them.
- Do not add a product API, database schema, Next.js module, background worker, production-container component, or deployment dependency.

---

### Task 1: Record the Approved Design and Execution State

**Files:**
- Create: `docs/superpowers/specs/2026-07-14-openai-symphony-local-pilot-design.md`
- Create: `docs/references/openai-symphony.md`
- Create: `docs/exec-plans/active/2026-07-14-openai-symphony-pilot.md`
- Modify: `docs/design-docs/README.md`
- Modify: `docs/references/README.md`
- Modify: `docs/exec-plans/active/README.md`

**Interfaces:**
- Produces the approved design, official-source record, and durable progress ledger used by later tasks.
- Does not change runtime behavior.

- [ ] Write the design with the approved architecture, Linear state model, hooks, security posture, failure handling, three pilot issues, and pass/fail criteria.
- [ ] Write the reference note with access date `2026-07-14` and links to the OpenAI announcement, Symphony repository, `SPEC.md`, Elixir README, and Codex App Server docs.
- [ ] Create the active plan with the exact required `## Status`, `## Progress`, `## Decisions`, and `## Verification` sections. Mark repository implementation active and external setup pending.
- [ ] Link every new document from its required index.
- [ ] Run `env COREPACK_HOME=/tmp/corepack pnpm docs:check` and `env COREPACK_HOME=/tmp/corepack pnpm format:check`; expect exit code 0.
- [ ] Commit with `docs: design OpenAI Symphony local pilot`.

### Task 2: Add a Tested Symphony Readiness Command

**Files:**
- Create: `scripts/check-symphony.ts`
- Create: `tests/unit/scripts/check-symphony.test.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produce `checkSymphonyReadiness(options): Promise<readonly ReadinessIssue[]>`, where every issue has `code` and `message` strings.
- Produce `runSymphonyReadiness(options): Promise<number>` for the CLI exit code.
- Add package command `pnpm symphony:check`.
- Consume root `WORKFLOW.md`, `LINEAR_API_KEY`, `LINEAR_PROJECT_SLUG`, local command results, and GitHub branch-protection JSON.

- [ ] Add `yaml` as a direct development dependency.
- [ ] Write failing Vitest cases for missing workflow, invalid front matter, unsafe workflow values, absent secrets without value disclosure, missing tools, wrong pinned commit, failed `gh` authentication, missing branch protection or CI contexts, and an already-running `supabase_db_agentic-coding-os` container.
- [ ] Run `env COREPACK_HOME=/tmp/corepack pnpm test:unit -- tests/unit/scripts/check-symphony.test.ts`; verify RED failures come from the missing implementation.
- [ ] Implement strict front-matter parsing and typed validation for all Global Constraints. Inject command execution and environment values so tests do not call real external services.
- [ ] Implement read-only host checks for `codex`, `mise`, `docker`, `gh`, pnpm, the pinned checkout, GitHub authentication/protection, and the shared Supabase container. Never include secret values in output.
- [ ] Make the CLI print concise failures followed by repair guidance and return 1; print a short readiness confirmation and return 0 when all checks pass.
- [ ] Run the focused test again and expect all cases to pass, then run the full unit suite.
- [ ] Commit with `feat: add Symphony readiness checks`.

### Task 3: Add the Repository Workflow and Operator Guide

**Files:**
- Create: `WORKFLOW.md`
- Create: `docs/SYMPHONY.md`
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `tests/unit/scripts/check-symphony.test.ts`

**Interfaces:**
- `WORKFLOW.md` is the repository-owned Symphony contract.
- `docs/SYMPHONY.md` is the operator runbook for setup, preflight, start, stop, recovery, and cleanup.
- The workflow consumes `LINEAR_API_KEY` and `LINEAR_PROJECT_SLUG` through explicit `$VAR` indirection.

- [ ] Add a failing contract test that loads the real root `WORKFLOW.md` and checks the approved tracker states, label, poll interval `30000`, workspace root, hook timeout `1200000`, concurrency `1`, pinned upstream revision, Codex policies, and prompt rules.
- [ ] Run the focused test and verify it fails because `WORKFLOW.md` does not exist.
- [ ] Add `WORKFLOW.md` with trusted hooks: shallow clone the current repository, create `.env` from `.env.example`, install locked dependencies, run full setup before work, and stop Supabase after work and before removal.
- [ ] Add the unattended prompt: read repository guidance, maintain a Linear workpad, use test-driven development, run focused checks plus `pnpm verify`, push a feature branch, open a PR, move to `Human Review`, handle `Rework`, record blockers, and never merge or push to `main`.
- [ ] Add the runbook with exact macOS install/build/start commands, environment setup without stored secrets, dashboard/log paths, exclusive database window, readiness command, recovery procedures, and uninstall steps.
- [ ] Link the runbook from `AGENTS.md` and `README.md` without turning `AGENTS.md` into a full manual.
- [ ] Run the focused test, docs check, formatting check, and full unit suite; expect exit code 0.
- [ ] Commit with `feat: add Symphony workflow contract`.

### Task 4: Configure the Trusted Local Pilot Environment

**External state:**
- GitHub repository `tienphatnguyendev/agent-first-nextjs-template`
- Linear workspace/team/project
- `~/code/openai-symphony`
- `~/code/symphony-workspaces`

- [ ] Repair `gh` authentication for the existing personal account.
- [ ] Protect `main`: require pull requests, require `Verify foundation` and `Build secure container`, block force pushes and deletion, and apply protection to administrators without requiring a second reviewer account.
- [ ] Create the Linear workspace, team, project, `symphony` label, `Human Review` state, and `Rework` state. Export the generated project slug and personal API key only in the Symphony shell.
- [ ] Install `mise`, clone OpenAI Symphony at the pinned commit, trust its version configuration, install its Erlang/Elixir versions, run `mix setup`, and build `bin/symphony`.
- [ ] Create the workspace/log directories and run `pnpm symphony:check`; expect exit code 0 before starting the daemon.
- [ ] Start Symphony with the repository's absolute `WORKFLOW.md`, external log root, and `--port 4000`. Confirm `/api/v1/state` responds only on loopback.
- [ ] Update the active execution plan with exact external versions and verification evidence.

### Task 5: Run and Evaluate the Three-Issue Pilot

**External state:** Linear issues, Git branches, pull requests, CI runs, Symphony logs, and issue workspaces.

- [ ] Create an unlabeled harmless issue and prove it does not dispatch.
- [ ] Create and label issue 1: add a focused-verification decision table to `docs/DEVELOPMENT.md`. Stop and restart Symphony after initial activity, then confirm it reuses the same workspace.
- [ ] Create and label issue 2: exclude `.pnpm-store/` from Git, Docker, Prettier, and ESLint without deleting its contents. Move it from `Human Review` to `Rework` once and confirm it resumes the preserved workspace.
- [ ] Create and label issue 3: make `scripts/check-docs.ts` report active execution plans missing from their index, with test-first evidence.
- [ ] For each issue, require one isolated workspace, a feature branch, a PR, focused-test and `pnpm verify` evidence, both passing CI jobs, human merge, `Done`, and workspace cleanup.
- [ ] Inspect Git, Symphony logs, PRs, and Linear comments for secret leakage or writes outside the issue workspace.
- [ ] Record elapsed time, tokens, retries, CI failures, and human corrections in the active plan.
- [ ] Mark the pilot successful only if all three PRs merge without a safety incident; otherwise record the failure and rerun the failed category after workflow repair.

## Status

Active. Repository implementation begins in an isolated worktree. External setup follows repository review.

## Progress

- 2026-07-14: Approved the phased local Elixir pilot design and created this implementation plan.

## Decisions

- Keep Symphony external to the product application.
- Use a dedicated Linear workspace/project and a required dispatch label.
- Use one fully unattended local agent with human PR merging and enforced branch protection.
- Run three varied, useful issues before deciding on a hardened implementation.

## Verification

- Baseline: `env COREPACK_HOME=/tmp/corepack pnpm test:unit` passed 130 tests on 2026-07-14.
- Required before repository handoff: `pnpm verify`.
- Required before daemon startup: `pnpm symphony:check`.
- Required before pilot success: all live checks in Task 5.

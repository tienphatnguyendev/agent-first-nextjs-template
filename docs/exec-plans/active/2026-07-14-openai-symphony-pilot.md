# OpenAI Symphony Local Pilot Execution Plan

This ledger tracks the approved
[local pilot design](../../superpowers/specs/2026-07-14-openai-symphony-local-pilot-design.md)
and its
[detailed implementation plan](../../superpowers/plans/2026-07-14-openai-symphony-pilot.md).

## Status

Active. Repository implementation is active in the isolated
`codex/openai-symphony-pilot` worktree. GitHub and the external Symphony build
are configured. Linear policy and readiness are verified. Daemon startup and
live pilot issues remain pending.

The next action is to run full repository verification, obtain review and both
required checks on a protected pull request, and have a human merge it into
remote `main`. A clean operator checkout must then match remote `main` and pass
a fresh readiness preflight before the daemon can start.

## Progress

- 2026-07-14: Approved the external local Elixir pilot and its safety
  boundaries.
- 2026-07-14: Recorded the design, official sources, and this durable progress
  ledger. The Task 1 documentation and formatting checks passed.
- 2026-07-14: Added the tested read-only readiness command.
- 2026-07-14: The controller verified GitHub CLI authentication and `main`
  protection.
- 2026-07-14: The controller verified `mise` 2026.7.5, the pinned
  `~/code/openai-symphony` checkout, Erlang 28.5, Elixir 1.19.5-otp-28,
  successful `mix setup` and `mix build`, generated `bin/symphony`, and the
  external workspace and log directories.
- 2026-07-14: Hex reported multiple security advisories in the pinned locked
  dependencies. The pilot remains preview-only and must stay on a trusted
  project and loopback dashboard. This evidence does not establish production
  safety.
- 2026-07-14: Verified through Linear's API the `Agentic Coding OS` project,
  `Solo` team with key `SOLO`, required workflow states, and `symphony` label.
  The controller created and verified the label. No external Linear object
  identifier or API-key value was recorded.
- 2026-07-14: Stopped the shared Supabase stack and passed the Keychain-backed
  `pnpm symphony:check` preflight without printing or recording the key. This
  was readiness evidence at that time, not final startup authorization after
  the repository contract changed.
- 2026-07-14: Reconciled `WORKFLOW.md`, the checker, tests, approved design,
  plans, and operator guide with the verified Linear state.
- Pending live work: run and evaluate the unlabeled control issue and three
  labeled pilot issues.

## Decisions

- Keep Symphony external to the Next.js application, production container, and
  CI runtime.
- Pin the Elixir reference implementation to commit
  `4cbe3a9699a73b862466c0b157ceca0c1985d6d7`.
- Use the `Solo` Linear team with key `SOLO`, the `Agentic Coding OS` project at
  slug `agentic-coding-os-0d02fd16cb9c`, and require the verified `symphony`
  label before dispatch. The supplied
  `https://linear.app/aaron-solo/project/agentic-coding-os-0d02fd16cb9c/overview`
  URL is authoritative. Linear's API verified the project, team, required
  states, and label.
- Configure terminal states as `Done`, `Closed`, `Cancelled`, `Canceled`, and
  `Duplicate`. Retain `Closed` and `Cancelled` as compatible aliases.
- Store the non-secret Linear project slug literally in `WORKFLOW.md`. The
  pinned Symphony revision expands `LINEAR_API_KEY` but does not expand an
  environment variable in `tracker.project_slug`.
- Run one unattended local agent because all workspaces share one Supabase
  project identifier and port set.
- Use protected pull requests, both required CI jobs, and human merges. Never
  allow Symphony to merge or push to `main`.
- Each issue workspace clones the remote repository default branch, `main`; it
  does not copy the local launch worktree. Starting before the reconciled
  contract reaches remote `main` is invalid.
- Gate daemon startup on full repository verification, a reviewed protected
  pull request with both required checks, a human merge into remote `main`, a
  clean operator checkout at that remote commit, and a fresh readiness
  preflight.

## Verification

- Baseline: `env COREPACK_HOME=/tmp/corepack pnpm test:unit` passed 130 tests on
  2026-07-14.
- Task 1 documentation: `env COREPACK_HOME=/tmp/corepack pnpm docs:check`
  passed on 2026-07-14.
- Task 1 formatting: `env COREPACK_HOME=/tmp/corepack pnpm format:check` passed
  on 2026-07-14.
- GitHub authentication and `main` protection: verified by the controller on
  2026-07-14.
- External build: the pinned revision, runtime versions, `mix setup`,
  `mix build`, `bin/symphony`, and runtime directories were verified by the
  controller on 2026-07-14. Hex dependency advisories remain an accepted
  preview-only risk, not evidence of production safety.
- Task 4 repository checks: 55 focused Symphony tests and all 173 unit tests
  passed. Documentation validation, formatting, and TypeScript checking also
  passed on 2026-07-14.
- Linear policy: Linear's API verified the project, `Solo` team with key
  `SOLO`, required states, and the newly created `symphony` label on
  2026-07-14.
- Preflight: the controller stopped Supabase and the Keychain-backed
  `pnpm symphony:check` passed on 2026-07-14. A fresh preflight after the human
  merge remains required.
- Startup gate: full `pnpm verify`, protected pull-request review and required
  checks, human merge into remote `main`, clean operator checkout alignment,
  and the fresh readiness preflight are pending.
- Daemon startup: the live start and loopback status check remain pending.
- Pilot success: the live checks and evidence in the approved design are
  pending.

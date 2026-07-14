# OpenAI Symphony Local Pilot Execution Plan

This ledger tracks the approved
[local pilot design](../../superpowers/specs/2026-07-14-openai-symphony-local-pilot-design.md)
and its
[detailed implementation plan](../../superpowers/plans/2026-07-14-openai-symphony-pilot.md).

## Status

Active. Repository implementation is active in the isolated
`codex/openai-symphony-pilot` worktree. GitHub and the external Symphony build
are partially configured. Linear policy settings and daemon startup remain
unverified.

The next action is to finish and review the repository workflow contract and
operator guide. Then verify Linear policy, run readiness, and start the local
daemon only on loopback.

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
- Remaining repository work: finish and review `WORKFLOW.md` and the operator
  guide.
- Pending external work: verify the Linear team, project, label, and states;
  export the API key; and verify readiness.
- Pending live work: run and evaluate the unlabeled control issue and three
  labeled pilot issues.

## Decisions

- Keep Symphony external to the Next.js application, production container, and
  CI runtime.
- Pin the Elixir reference implementation to commit
  `4cbe3a9699a73b862466c0b157ceca0c1985d6d7`.
- Use the `Symphony Pilot` Linear team, the `Agentic Coding OS` project at slug
  `agentic-coding-os-0d02fd16cb9c`, and require the `symphony` label before
  dispatch. The supplied
  `https://linear.app/aaron-solo/project/agentic-coding-os-0d02fd16cb9c/overview`
  URL is authoritative, but the external Linear policy settings remain
  unverified.
- Store the non-secret Linear project slug literally in `WORKFLOW.md`. The
  pinned Symphony revision expands `LINEAR_API_KEY` but does not expand an
  environment variable in `tracker.project_slug`.
- Run one unattended local agent because all workspaces share one Supabase
  project identifier and port set.
- Use protected pull requests, both required CI jobs, and human merges. Never
  allow Symphony to merge or push to `main`.
- Finish repository review and verify Linear policy before starting the daemon.

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
- Repository handoff: `pnpm verify` is pending.
- Linear policy: the authoritative URL and slug are recorded; team, label, and
  state verification is pending.
- Daemon startup: `pnpm symphony:check` and the loopback status check are
  pending.
- Pilot success: the live checks and evidence in the approved design are
  pending.

# OpenAI Symphony Local Pilot Execution Plan

This ledger tracks the approved
[local pilot design](../../superpowers/specs/2026-07-14-openai-symphony-local-pilot-design.md)
and its
[detailed implementation plan](../../superpowers/plans/2026-07-14-openai-symphony-pilot.md).

## Status

Active. Repository implementation is active in the isolated
`codex/openai-symphony-pilot` worktree. External GitHub, Linear, and Symphony
setup is pending repository implementation and review.

The next action is to finish the repository-owned design, readiness command,
workflow contract, and operator guide. External setup must not start before
that review.

## Progress

- 2026-07-14: Approved the external local Elixir pilot and its safety
  boundaries.
- 2026-07-14: Recorded the design, official sources, and this durable progress
  ledger. The Task 1 documentation and formatting checks passed.
- Remaining repository work: add the tested read-only readiness command, then
  add `WORKFLOW.md` and the operator guide.
- Pending external work: protect GitHub, configure Linear, install the pinned
  Symphony checkout, and verify readiness.
- Pending live work: run and evaluate the unlabeled control issue and three
  labeled pilot issues.

## Decisions

- Keep Symphony external to the Next.js application, production container, and
  CI runtime.
- Pin the Elixir reference implementation to commit
  `4cbe3a9699a73b862466c0b157ceca0c1985d6d7`.
- Use the dedicated `Symphony Pilot` Linear project and require the `symphony`
  label before dispatch.
- Run one unattended local agent because all workspaces share one Supabase
  project identifier and port set.
- Use protected pull requests, both required CI jobs, and human merges. Never
  allow Symphony to merge or push to `main`.
- Complete repository implementation and review before changing external
  services or starting the daemon.

## Verification

- Baseline: `env COREPACK_HOME=/tmp/corepack pnpm test:unit` passed 130 tests on
  2026-07-14.
- Task 1 documentation: `env COREPACK_HOME=/tmp/corepack pnpm docs:check`
  passed on 2026-07-14.
- Task 1 formatting: `env COREPACK_HOME=/tmp/corepack pnpm format:check` passed
  on 2026-07-14.
- Repository handoff: `pnpm verify` is pending.
- Daemon startup: `pnpm symphony:check` is pending implementation and external
  setup.
- Pilot success: the live checks and evidence in the approved design are
  pending.

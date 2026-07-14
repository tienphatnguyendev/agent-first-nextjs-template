# OpenAI Symphony Sources

**Accessed:** 2026-07-14

## Scope

These official sources support the approved local Symphony pilot. The pilot
pins the reference implementation to commit
`4cbe3a9699a73b862466c0b157ceca0c1985d6d7` because the upstream project can
change after this access date.

## Sources

- [An open-source spec for Codex orchestration: Symphony](https://openai.com/index/open-source-codex-orchestration-symphony/)
  introduces Symphony as an issue-tracker control plane for coding agents and
  explains the move from supervising sessions to managing work.
- [OpenAI Symphony repository](https://github.com/openai/symphony) provides the
  open-source specification and experimental reference implementation. Its
  README warns that the project is an engineering preview for trusted
  environments.
- [Symphony service specification at the pinned revision](https://github.com/openai/symphony/blob/4cbe3a9699a73b862466c0b157ceca0c1985d6d7/SPEC.md)
  defines the workflow loader, tracker client, orchestrator, workspace manager,
  agent runner, retries, cleanup, and observability boundaries.
- [Elixir reference README at the pinned revision](https://github.com/openai/symphony/blob/4cbe3a9699a73b862466c0b157ceca0c1985d6d7/elixir/README.md)
  documents the prototype's prerequisites, build commands, workflow settings,
  dashboard, and runtime behavior.
- [Codex App Server documentation](https://developers.openai.com/codex/app-server)
  defines the programmatic Codex interface that the Elixir implementation uses
  to start threads and turns and receive streamed events.

## Repository Use

The [approved pilot design](../superpowers/specs/2026-07-14-openai-symphony-local-pilot-design.md)
uses the source boundaries but adds repository-specific controls. These
controls include one local agent, a required Linear label, a pinned upstream
revision, read-only readiness checks, loopback-only status access, protected
pull requests, and human merges.

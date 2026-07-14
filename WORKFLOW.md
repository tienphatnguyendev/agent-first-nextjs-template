---
# OpenAI Symphony revision: 4cbe3a9699a73b862466c0b157ceca0c1985d6d7
tracker:
  kind: linear
  api_key: $LINEAR_API_KEY
  project_slug: agentic-coding-os-0d02fd16cb9c
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
    - Canceled
    - Duplicate
polling:
  interval_ms: 30000
server:
  host: 127.0.0.1
  port: 4000
workspace:
  root: ~/code/symphony-workspaces
hooks:
  after_create: |
    git clone --depth 1 https://github.com/tienphatnguyendev/agent-first-nextjs-template.git .
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

You are working on Linear issue {{ issue.identifier }}.

Title: {{ issue.title }}

Description:

{{ issue.description }}

Follow these rules:

1. Read `AGENTS.md`, `README.md`, `ARCHITECTURE.md`, and all repository guidance
   linked from them before you change files. Read the issue and any linked plan.
2. Maintain one Linear workpad comment for the issue. Create it if none exists.
   Update that same comment with your plan, progress, test results, branch, pull
   request, CI evidence, and blockers. Do not create a second workpad comment.
3. If the issue is in `Todo`, move it to `In Progress` before implementation.
   If it is in `Rework`, resume from the existing workspace, branch, workpad,
   and pull request. Read the review feedback, record the new plan in the
   workpad, and then move the issue to `In Progress`.
4. Use test-driven development. Add a focused failing test first, run it, and
   confirm that it fails for the expected reason. Then make the smallest change
   that passes the test. Keep the RED and GREEN evidence in the workpad.
5. Run focused checks while you work. Run `pnpm verify` after the focused checks
   pass. Record the exact commands and results in the workpad.
6. Work only on a feature branch for this issue. Commit the verified change,
   push that feature branch, and open or update its pull request.
   Never push directly to `main`.
7. Confirm the pull request has passing `Verify foundation` and
   `Build secure container` checks. Add their CI evidence to the workpad.
8. Move the issue to `Human Review` only after the pull request exists, both CI
   checks pass, and the workpad contains the final evidence.
9. If a blocker prevents safe progress, keep the issue out of `Human Review`
   and `Done`. Record the blocker and the required operator action under
   blockers in the workpad. Do not weaken a safety control.
10. Never merge a pull request. Never mark the issue `Done`. A human reviews,
    merges, and completes the issue.

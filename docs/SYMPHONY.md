# Symphony Local Pilot Runbook

This guide operates the experimental OpenAI Symphony service on one controlled
macOS developer machine. Symphony stays outside the application and production
runtime. These steps describe the full setup. The evidence below separates
verified preparation from the daemon and pilot work that remains pending.

The fixed local paths and address are:

| Purpose                    | Value                                       |
| -------------------------- | ------------------------------------------- |
| External Symphony checkout | `~/code/openai-symphony`                    |
| Issue workspaces           | `~/code/symphony-workspaces`                |
| Service logs               | `~/Library/Logs/agentic-coding-os-symphony` |
| Dashboard and status API   | `http://127.0.0.1:4000`                     |

The pilot must use OpenAI Symphony revision
`4cbe3a9699a73b862466c0b157ceca0c1985d6d7`.

## Pinned project-slug compatibility

The pinned revision expands `tracker.api_key: $LINEAR_API_KEY`, but it does not
expand an environment variable in `tracker.project_slug`. The project slug is
not a secret, so `WORKFLOW.md` stores the authoritative literal
`agentic-coding-os-0d02fd16cb9c`. `LINEAR_API_KEY` remains the only Linear
secret in the Symphony process environment.

## Current external evidence and preview risk

On 2026-07-14, the controller verified GitHub CLI authentication and protection
for `main`. It also verified `mise` 2026.7.5, the pinned checkout under
`~/code/openai-symphony`, Erlang 28.5, Elixir 1.19.5-otp-28, successful
`mix setup` and `mix build`, the generated `bin/symphony`, and the external
workspace and log directories. This evidence does not verify the Linear team,
label, or state settings, and it does not show that the daemon has started.

The controller then verified the project, team, required workflow states, and
label through Linear's API. The verified workspace URL slug is `aaron-solo`;
the project is `Agentic Coding OS`; and the team is `Solo` with key `SOLO`.
The API-verified states are `Todo`, `In Progress`, `Rework`, `Human Review`,
`Done`, `Canceled`, and `Duplicate`. The controller created the `symphony`
label and verified it through the same API. `Closed` and `Cancelled` remain
compatible terminal aliases in the local workflow.

The controller also stopped the shared Supabase stack and passed
`pnpm symphony:check` with the Linear key supplied from macOS Keychain to the
preflight process. The key value was not printed or written to this repository.
Starting the live daemon, running the unlabeled control, and running the three
labeled pilot issues remain pending.

Hex reported multiple security advisories in the pinned upstream locked
dependencies during setup. Treat this service as preview software only. Run it
for this trusted project on a controlled developer machine, keep the dashboard
on loopback, and do not treat this pilot as production-safe.

## Prepare GitHub and Linear

Authenticate GitHub CLI with an account that can read and push branches in
`tienphatnguyendev/agent-first-nextjs-template`:

```bash
gh auth login
gh auth status
```

Protect `main` before the pilot starts. Require pull requests and the exact CI
contexts `Verify foundation` and `Build secure container`. Apply protection to
administrators and block force pushes and branch deletion. Confirm the current
settings without changing them:

```bash
gh api repos/tienphatnguyendev/agent-first-nextjs-template/branches/main/protection
```

Use these API-verified Linear values:

- workspace: `Agentic Coding OS`
- workspace URL slug: `aaron-solo`
- team: `Solo`
- project: `Agentic Coding OS`
- project URL:
  `https://linear.app/aaron-solo/project/agentic-coding-os-0d02fd16cb9c/overview`
- project slug: `agentic-coding-os-0d02fd16cb9c`
- team key: `SOLO`
- required issue label: `symphony`
- active states: `Todo`, `In Progress`, and `Rework`
- review state: `Human Review`, which must be neither active nor terminal
- terminal states: `Done`, `Closed`, `Cancelled`, `Canceled`, and `Duplicate`

Linear's API verified the project, team, required states, and label on
2026-07-14. It also verified that the `symphony` label exists after the
controller created it. Do not copy external Linear object identifiers into
repository files or operator notes.

Create a Linear personal API key under **Settings -> Security & access ->
Personal API keys**. Do not put the API key in a repository file, `.env`, shell
profile, command argument, log, or Linear comment. The project slug is a
non-secret repository setting and must match the literal above.

## Install and build Symphony

Install `mise` with Homebrew, then clone and pin the external checkout:

```bash
brew install mise
mkdir -p ~/code
git clone https://github.com/openai/symphony.git ~/code/openai-symphony
git -C ~/code/openai-symphony checkout --detach 4cbe3a9699a73b862466c0b157ceca0c1985d6d7
test "$(git -C ~/code/openai-symphony rev-parse HEAD)" = "4cbe3a9699a73b862466c0b157ceca0c1985d6d7"
```

Trust the pinned upstream version file, install its Erlang and Elixir versions,
then set up and build the Elixir service:

```bash
cd ~/code/openai-symphony/elixir
mise trust
mise install
mise exec -- elixir --version
mise exec -- mix setup
mise exec -- mix build
```

Create the runtime directories:

```bash
mkdir -p ~/code/symphony-workspaces
mkdir -p ~/Library/Logs/agentic-coding-os-symphony
```

## Export the process environment

Open a dedicated zsh session for Symphony. Read the values into that shell and
export them only to the Symphony process and its children:

```zsh
read -rs "LINEAR_API_KEY?Linear API key: "; printf '\n'
export LINEAR_API_KEY
```

Do not add this export to `.zshrc`, another shell profile, an `.env` file, or a
script. Close the shell or run the `unset` command in the stop procedure to
remove the value from that process environment.

## Reserve the Supabase window

Every repository checkout uses the same local Supabase ports and project
identifier. Stop manual development servers and give Symphony exclusive use of
the database window. Do not run `pnpm dev`, `pnpm run setup`, or another
Symphony service in any checkout during that window.

The following command must print nothing before startup:

```bash
docker ps --filter 'name=^/supabase_db_agentic-coding-os$' --filter status=running --format '{{.Names}}'
```

If it prints `supabase_db_agentic-coding-os`, stop Supabase from the checkout
that started it:

```bash
pnpm exec supabase stop --no-backup
```

## Run the preflight

From the repository checkout that contains this runbook, run the read-only
readiness command:

```bash
pnpm symphony:check
```

Do not start Symphony until this command exits with code 0. It checks the real
`WORKFLOW.md`, required tools and `LINEAR_API_KEY`, the pinned checkout,
GitHub authentication and branch protection, and the shared Supabase
container. It does not create or repair external resources.

## Start and observe

After the preflight passes, keep Symphony in the foreground so its owner and
stop signal stay clear. Run these exact commands from the repository checkout:

```bash
REPOSITORY_ROOT="$(git rev-parse --show-toplevel)"
cd ~/code/openai-symphony/elixir
mise exec -- ./bin/symphony \
  --i-understand-that-this-will-be-running-without-the-usual-guardrails \
  --logs-root "$HOME/Library/Logs/agentic-coding-os-symphony" \
  --port 4000 \
  "$REPOSITORY_ROOT/WORKFLOW.md"
```

The acknowledgement flag is required by the pinned experimental CLI. It does
not remove this repository's workspace, branch, CI, or human-review controls.
The service polls Linear every 30 seconds and runs at most one agent. Open the
dashboard only through `http://127.0.0.1:4000`. In another terminal, confirm
the loopback status API responds:

```bash
curl --fail --silent --show-error http://127.0.0.1:4000/api/v1/state
lsof -nP -iTCP:4000 -sTCP:LISTEN
```

The `lsof` output must show only `127.0.0.1:4000`, not `*:4000` or another
network interface.

Start with one harmless control issue that has no `symphony` label. It must not
dispatch. Only add the label to an issue that is ready for unattended work.

## Stop safely

Press `Control-C` once in the foreground service terminal and wait for the
Elixir process to exit. If that terminal disappeared, find the exact Symphony
process and send a normal termination signal:

```bash
pgrep -fl 'bin/symphony'
SYMPHONY_PID=12345
kill -TERM "$SYMPHONY_PID"
```

Replace `12345` with the process identifier printed by `pgrep`, after checking
its full command. Do not use `kill -9` for a normal stop. Then list the issue
workspaces, set the actual directory name, stop any remaining shared Supabase
stack, and clear the shell values:

```bash
ls -la "$HOME/code/symphony-workspaces"
ISSUE_WORKSPACE=replace-with-directory-name
cd "$HOME/code/symphony-workspaces/$ISSUE_WORKSPACE"
pnpm exec supabase stop --no-backup
unset LINEAR_API_KEY
```

If no issue workspace exists, skip the `cd` and Supabase command.
Confirm that no dashboard listener or shared database remains:

```bash
lsof -nP -iTCP:4000 -sTCP:LISTEN
docker ps --filter 'name=^/supabase_db_agentic-coding-os$' --filter status=running --format '{{.Names}}'
```

Both commands must print nothing. `lsof` normally exits with code 1 when it
finds no matching listener.

## Recover an interrupted issue

Do not delete a workspace after an unexpected exit. First keep the issue in an
active state (`Todo`, `In Progress`, or `Rework`) and inspect its saved state:

```bash
ls -la "$HOME/code/symphony-workspaces"
ISSUE_WORKSPACE=replace-with-directory-name
cd "$HOME/code/symphony-workspaces/$ISSUE_WORKSPACE"
git status --short --branch
git log -5 --oneline
pnpm exec supabase stop --no-backup
docker ps --filter 'name=^/supabase_db_agentic-coding-os$' --filter status=running --format '{{.Names}}'
```

Inspect the issue workpad, pull request, review feedback, and service log. List
the log files, then use the printed path for the second command:

```bash
find ~/Library/Logs/agentic-coding-os-symphony -type f -print
LOG_FILE=/absolute/path/printed-by-find
tail -n 200 "$LOG_FILE"
```

Replace the example `LOG_FILE` value with one path printed by `find`. Return to
the repository checkout, export the process environment again, and rerun the
preflight:

```bash
pnpm symphony:check
```

When the check passes, repeat the exact start commands. Symphony uses the same
deterministic issue path, so it resumes the existing workspace. For review
changes, move the Linear issue from `Human Review` to `Rework`; do not create a
new workspace or branch. If the workflow file failed to reload, correct it,
rerun `pnpm symphony:check`, and restart the service. Record unresolved blockers
in the one Linear workpad comment before asking the operator for help.

## Clean up completed work

After a human merges the pull request, move the issue to `Done`. Symphony runs
the cleanup hook and removes its workspace. It also removes workspaces for
`Closed`, `Cancelled`, `Canceled`, and `Duplicate` issues. Check the expected
result:

```bash
ISSUE_WORKSPACE=replace-with-directory-name
test ! -d "$HOME/code/symphony-workspaces/$ISSUE_WORKSPACE"
```

If terminal cleanup failed, stop Symphony first. Confirm the issue is terminal,
inspect the path, and then remove only that issue workspace:

```bash
ISSUE_WORKSPACE=replace-with-directory-name
cd "$HOME/code/symphony-workspaces/$ISSUE_WORKSPACE"
pnpm exec supabase stop --no-backup
cd "$HOME/code/symphony-workspaces"
rm -rf -- "$ISSUE_WORKSPACE"
```

Never use the manual removal commands for an active or `Human Review` issue.

## Uninstall the local pilot

Stop Symphony, stop Supabase, and close all active issues before removal.
Preserve any branch or workspace that still contains unpushed work. Revoke the
Linear personal API key in Linear, then remove the external local files:

```bash
unset LINEAR_API_KEY
rm -rf -- "$HOME/code/openai-symphony"
rm -rf -- "$HOME/code/symphony-workspaces"
rm -rf -- "$HOME/Library/Logs/agentic-coding-os-symphony"
```

If this pilot was the only reason for installing `mise`, remove it separately:

```bash
brew uninstall mise
```

The tracked `WORKFLOW.md` and this runbook remain repository history. Removing
them requires a reviewed repository change; local uninstall does not change
the repository.

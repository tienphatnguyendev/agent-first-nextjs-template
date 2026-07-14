# Development

## Prepare the repository

Install Node.js 24 or later, pnpm 10 or later, Docker, and the Supabase CLI.
From the repository root:

```bash
pnpm install
test -e .env || cp .env.example .env
pnpm run setup
```

The guarded copy keeps an existing `.env` unchanged. Add local server values to
`.env` before setup. Do not commit it or copy its values into documentation.
The setup script never creates, copies, or overwrites `.env`. It stops and tells
you to create the file when it is missing. Always include `run` in
`pnpm run setup`: pnpm also has an unrelated built-in command named `setup`.
Repository setup starts the database, generates and deploys Prisma files, and
installs only Playwright Chromium. In CI, it also installs Chromium system
dependencies.
`DATABASE_URL` handles application queries. `DIRECT_URL` handles Prisma
migrations and administrative commands through a direct database connection.

Run `pnpm dev` to start Supabase Database and the Next.js application. This
foundation uses Supabase Database only. The local environment excludes Auth,
Storage, Realtime, Edge Functions, Studio, and the Data API. Do not add a
browser Supabase client.

## Use focused feedback

Run the smallest relevant check while you edit:

```bash
pnpm test:unit -- tests/path/to/file.test.ts
pnpm docs:check
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
```

Run `pnpm test` when a change affects the database or more than one layer. Run
`pnpm test:e2e` when a change affects browser behavior or the production build.
Run `pnpm verify` before you finish. It runs all required checks in the order
defined in [QUALITY.md](QUALITY.md).

`pnpm test:e2e` creates a fresh production build, starts it with `next start`,
and runs the browser smoke tests. Use `pnpm test:e2e:run` only when a current
production build already exists. Playwright never reuses an existing server,
runs one Chromium worker, and waits for the database-backed health endpoint
before starting tests. Stop any process that already uses port 3000 first.

Playwright writes its HTML report to `artifacts/playwright/report/`, test
attachments to `artifacts/playwright/test-results/`, JUnit XML to
`artifacts/test-results/playwright.xml`, and production output to
`artifacts/application.log`. A failed browser test keeps its screenshot, trace,
and video. These files may contain page or log data, so never put secrets in
browser-visible values or application output.

Unit and integration tests show readable output in the terminal and also write
stable JUnit XML reports under `artifacts/test-results/`. Run
`pnpm artifacts:prepare` to create the test and Playwright artifact directories
without deleting earlier evidence. Git ignores every file under `artifacts/`.

Write a failing test before you change behavior. Confirm that it fails for the
expected reason, add the smallest implementation, and rerun the focused test.

## Change the database

Prisma is the sole schema and migration authority. Change
`prisma/schema.prisma`, then create a named migration:

```bash
pnpm db:migrate -- --name <description>
```

Commit the matching files under `prisma/migrations/`. Never create a migration
under `supabase/migrations/`, and never change the application schema through a
Supabase dashboard. Use `pnpm db:reset` only when you intend to rebuild the
local database and reapply all Prisma migrations.

## Local environment limit

Run one local Supabase environment at a time. The checked-in configuration uses
one stable set of ports and one project identifier. Simultaneous Git worktrees
would need isolated ports and project identifiers to avoid conflicts. That
extra coordination is outside this foundation. Agents may use separate
branches, but they must share or coordinate the one local Supabase stack.

Production hosting stays neutral. Do not add vendor-specific deployment steps
without an approved design.

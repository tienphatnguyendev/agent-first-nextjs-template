# Agent-First Modular Monolith

This repository provides a reusable foundation for one full-stack TypeScript
application. It combines a Next.js App Router application with Supabase
PostgreSQL and Prisma in one deployable modular monolith.

Start with the [architecture rules](ARCHITECTURE.md) before you add product
code. Use the short [repository map](AGENTS.md) to find detailed guidance.

## Local setup

Install Node.js 24 or later, pnpm 10 or later, Docker, and the Supabase CLI.
Then run:

```bash
pnpm install
test -e .env || cp .env.example .env
pnpm run setup
pnpm dev
```

The guarded copy keeps an existing `.env` unchanged. Fill `.env` with your local
server values before `pnpm run setup`. Do not commit that file. `DATABASE_URL`
serves normal application queries. `DIRECT_URL` serves Prisma migrations and
administrative commands. Keep both values on the server and never print them in
logs.

The local foundation supports one active Supabase environment at a time.
Separate ports and Supabase project identifiers for simultaneous Git worktrees
are outside this foundation. Coordinate use of the one local database.

Read [development guidance](docs/DEVELOPMENT.md) for focused commands and
database changes.

## Stable commands

- `pnpm run setup` prepares Supabase Database, Prisma, and Playwright.
- `pnpm dev` starts the local database and Next.js.
- `pnpm verify` runs the complete repository check in a stable order.
- `pnpm test` runs unit and integration tests.
- `pnpm test:e2e` builds the application and runs browser tests.
- `pnpm db:migrate -- --name <description>` creates a named Prisma migration.
- `pnpm db:reset` rebuilds the local database with Prisma migrations.
- `pnpm run container:build` builds the hosting-neutral production image.
- `pnpm run container:check` confirms that the image runs as `nextjs`.

## Database scope

This foundation uses Supabase Database only. It does not use Supabase Auth,
Storage, Realtime, Edge Functions, Studio, the Data API, or a browser Supabase
client.

Prisma alone owns the schema and migration history. Keep schema changes in
`prisma/schema.prisma` and `prisma/migrations/`. Never create
`supabase/migrations/`.

## Production image and CI

Build and inspect the production image with:

```bash
pnpm run container:build
pnpm run container:check
```

The post-build step makes the standalone Next.js directory complete by adding
the public and static files. The multi-stage image copies that complete
directory once into its final stage. It runs as the non-root `nextjs` user.
Non-root means the application does not have administrator access inside the
container. The image health check calls `GET /api/health` on port 3000.

The build uses a fixed, local-only placeholder for Prisma code generation. It
does not receive real database values. Supply `DATABASE_URL`, `DIRECT_URL`, and
other server values through the selected runtime secret system when the
container starts. Run `pnpm db:deploy` as a separate release step before the
new application version starts.

GitHub Actions runs `pnpm run setup` and `pnpm run verify`, then builds and
checks the same production image. A failed verification run keeps `artifacts/`
for investigation. The workflow does not publish or deploy the image.

## Repository knowledge

- [Architecture](ARCHITECTURE.md)
- [Development](docs/DEVELOPMENT.md)
- [Plans](docs/PLANS.md)
- [Quality](docs/QUALITY.md)
- [Reliability](docs/RELIABILITY.md)
- [Security](docs/SECURITY.md)
- [Design documents](docs/design-docs/README.md)
- [Product specifications](docs/product-specs/README.md)

The production design stays independent from any hosting vendor. This
repository builds and tests the application but does not select or configure a
production host.

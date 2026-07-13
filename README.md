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
cp .env.example .env
pnpm setup
pnpm dev
```

Fill `.env` with your local server values before `pnpm setup`. Do not commit
that file. `DATABASE_URL` serves normal application queries. `DIRECT_URL`
serves Prisma migrations and administrative commands. Keep both values on the
server and never print them in logs.

The local foundation supports one active Supabase environment at a time.
Separate ports and Supabase project identifiers for simultaneous Git worktrees
are outside this foundation. Coordinate use of the one local database.

Read [development guidance](docs/DEVELOPMENT.md) for focused commands and
database changes.

## Stable commands

- `pnpm setup` prepares Supabase Database, Prisma, and Playwright.
- `pnpm dev` starts the local database and Next.js.
- `pnpm verify` runs the complete repository check in a stable order.
- `pnpm test` runs unit and integration tests.
- `pnpm test:e2e` builds the application and runs browser tests.
- `pnpm db:migrate -- --name <description>` creates a named Prisma migration.
- `pnpm db:reset` rebuilds the local database with Prisma migrations.

## Database scope

This foundation uses Supabase Database only. It does not use Supabase Auth,
Storage, Realtime, Edge Functions, Studio, the Data API, or a browser Supabase
client.

Prisma alone owns the schema and migration history. Keep schema changes in
`prisma/schema.prisma` and `prisma/migrations/`. Never create
`supabase/migrations/`.

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

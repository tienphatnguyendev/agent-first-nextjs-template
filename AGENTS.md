# Repository Map

Start with [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

## Stable commands

- `pnpm run setup` prepares Supabase Database, Prisma, and Playwright.
- `pnpm dev` starts the database and application.
- `pnpm verify` runs every required check.
- `pnpm test` runs unit and integration tests.
- `pnpm test:e2e` builds and tests the production application.
- `pnpm db:migrate -- --name <description>` creates a migration.
- `pnpm db:reset` rebuilds only the local database.

## Knowledge map

- [Architecture](ARCHITECTURE.md)
- [Development](docs/DEVELOPMENT.md)
- [Active plans](docs/exec-plans/active/README.md)
- [Plan rules](docs/PLANS.md)
- [Quality](docs/QUALITY.md)
- [Reliability](docs/RELIABILITY.md)
- [Security](docs/SECURITY.md)

Keep product code inside its module. Import another module only through its
`index.ts`. Never expose database or server environment code to the browser.

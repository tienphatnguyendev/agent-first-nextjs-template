# Agent-First Modular Monolith Foundation

**Status:** Approved design  
**Date:** 2026-07-13

## 1. Purpose

This repository will provide a reusable foundation for one full-stack prototype. It will follow the harness engineering practices described in OpenAI's [Harness engineering](https://openai.com/index/harness-engineering/) article.

The foundation will optimize the repository for both people and coding agents. It will place important knowledge in version-controlled files, provide fast feedback through stable commands, and enforce important architecture rules automatically.

The application will use a modular monolith. A modular monolith is one deployable application divided into clear internal modules. This model keeps deployment simple while allowing the codebase to grow without mixing every responsibility together.

## 2. Goals

- Create one deployable Next.js application.
- Use TypeScript throughout the application.
- Use Supabase only as the PostgreSQL provider.
- Use Prisma as the database client and schema migration tool.
- Give future product modules clear and enforceable boundaries.
- Give people and agents one command for complete local verification.
- Keep repository knowledge short, structured, searchable, and version controlled.
- Make failures easy for an agent to inspect through logs, test reports, screenshots, and browser traces.
- Keep the foundation independent from a production hosting provider.

## 3. Non-goals

The first foundation will not include:

- Product-specific modules or example business features
- Authentication or authorization
- Supabase Auth, Storage, Realtime, or Edge Functions
- Email, billing, queues, or background jobs
- A full metrics, tracing, or log-storage platform
- Multiple simultaneous local Git worktree environments
- Automatic pull-request merging
- Automatic production deployment
- A hosting-provider configuration for Vercel, Fly.io, AWS, or another provider

## 4. Main Technology Choices

| Area | Choice | Reason |
| --- | --- | --- |
| Application | Next.js with the App Router | It supports the browser UI and server code in one application. |
| Language | TypeScript with strict checks | It makes interfaces and invalid states easier to detect. |
| Package manager | pnpm | It provides fast and repeatable dependency installation. |
| Database provider | Supabase Database | It provides managed PostgreSQL and a local development stack. |
| Database client | Prisma | It provides typed queries and versioned schema migrations. |
| Boundary validation | Zod | It validates data received from users, environment variables, and external systems. |
| Unit and integration tests | Vitest and React Testing Library | They support fast tests for TypeScript and React code. |
| Browser tests | Playwright | It validates the application through a real browser. |
| Architecture checks | dependency-cruiser | It can reject imports that break module or layer rules. |
| Code quality | ESLint and Prettier | They provide consistent, automatic checks. |
| Local services | Supabase CLI and Docker | They provide a repeatable local PostgreSQL environment. |
| Continuous integration | GitHub Actions | It can run the same verification commands used locally. |

The project will not use Turborepo or a monorepo structure. One prototype does not need the additional workspace and build-system complexity.

## 5. Repository Structure

```text
.
├── AGENTS.md
├── ARCHITECTURE.md
├── README.md
├── docs/
│   ├── decisions/
│   ├── design-docs/
│   ├── exec-plans/
│   │   ├── active/
│   │   └── completed/
│   ├── product-specs/
│   ├── references/
│   ├── DEVELOPMENT.md
│   ├── PLANS.md
│   ├── QUALITY.md
│   ├── RELIABILITY.md
│   └── SECURITY.md
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── prisma.config.ts
├── scripts/
├── src/
│   ├── app/
│   ├── modules/
│   │   └── README.md
│   ├── platform/
│   │   ├── database/
│   │   ├── env/
│   │   └── logging/
│   └── shared/
├── supabase/
│   └── config.toml
└── tests/
    ├── architecture/
    ├── integration/
    └── e2e/
```

`AGENTS.md` will act as a short map, not a complete manual. It will point to the commands, architecture document, current plans, and deeper guidance under `docs/`.

`ARCHITECTURE.md` will explain the system boundaries and link to more detailed design documents. The documents under `docs/` will be the main source of repository knowledge.

## 6. Module Architecture

Future product modules will use this structure:

```text
src/modules/<module>/
├── domain/
├── application/
├── infrastructure/
├── ui/
└── index.ts
```

Each directory has one purpose:

- `domain/` contains business rules and types. It cannot import Next.js, React, Prisma, or external service clients.
- `application/` contains use cases and interfaces for required infrastructure. It can depend on `domain/`.
- `infrastructure/` implements database and external-service interfaces. It can depend on `application/`, `domain/`, and `platform/`.
- `ui/` contains module React components and server actions. It uses application use cases and the module's public types.
- `index.ts` exposes the module's supported public interface.

The dependency rules will enforce these boundaries:

- Next.js routes under `src/app/` can use a module only through its public `index.ts` file.
- One module cannot import another module's private files.
- `src/shared/` cannot depend on product modules or platform implementations.
- Browser code cannot import server-only database, environment, or logging code.
- Cross-module behavior must use a public module interface or move into an explicit shared service.

The architecture checker will include repair guidance in its error messages. This guidance will tell an agent which public interface or layer it should use.

## 7. Supabase and Prisma Strategy

Supabase will provide PostgreSQL only. The application will not install the Supabase browser client and will not expose database credentials or Supabase keys to browser code.

The local startup script and `supabase/config.toml` will disable or exclude Auth, Storage, Realtime, Edge Functions, Studio, the Data API, and other non-database services. Local application traffic will connect directly to the PostgreSQL port.

Prisma will be the only schema and migration authority:

- `prisma/schema.prisma` will define application tables.
- `prisma/migrations/` will contain all application schema changes.
- The repository will not create a second migration history under `supabase/migrations/`.
- Agents and developers must not change the remote schema through the Supabase Dashboard.
- Local reset and CI setup commands will apply Prisma migrations after starting the local Supabase database.
- Production releases will run `prisma migrate deploy` before starting the new application version.

The environment will use two server-only connection values:

- `DATABASE_URL` will serve normal application queries. Local development will use the direct local PostgreSQL URL. A serverless production deployment should use the Supabase transaction pooler.
- `DIRECT_URL` will serve migrations and administrative commands through a direct database connection.

The environment validation layer will check both values before database code starts. `.env.example` will document the required format without containing real secrets.

## 8. Request and Data Flow

```text
Browser
  -> Next.js route, server action, or server component
  -> Zod boundary validation
  -> Module application use case
  -> Module repository interface
  -> Prisma repository implementation
  -> Supabase PostgreSQL
```

Results return through the same layers using defined response types. Prisma records will not pass directly into browser components. A module will map database records to domain objects and safe response values.

This flow keeps database and framework details outside the business rules. It also keeps Supabase replaceable because only infrastructure and configuration code know which PostgreSQL provider the application uses.

## 9. Error Handling and Logging

The application will divide failures into three groups:

- Validation failures will return safe and specific input messages.
- Expected business-rule failures will use defined error types and stable public error codes.
- Unexpected failures will return a generic response and write full details to server logs.

Every incoming request will receive a correlation ID. A correlation ID is a value that connects one request, its logs, and its error response. The application will include this ID in structured JSON logs and safe error responses.

Logs will never include database credentials, secrets, authorization values, or full sensitive request bodies. Browser responses will never expose SQL, stack traces, or internal file paths.

The application will provide a health endpoint. It will check application startup and database availability, but it will return only a simple status and no database details.

## 10. Stable Commands

The repository will expose these main commands:

```bash
pnpm setup
pnpm dev
pnpm verify
pnpm test
pnpm test:e2e
pnpm db:migrate
pnpm db:reset
```

Their behavior will be:

- `pnpm setup` validates required local tools, starts local Supabase, generates Prisma code, applies migrations, and installs Playwright's browser when needed. It does not overwrite an existing environment file.
- `pnpm dev` ensures the local database is available and starts Next.js.
- `pnpm verify` runs every required repository check in a stable order.
- `pnpm test` runs unit and integration tests.
- `pnpm test:e2e` builds and tests the application through Playwright.
- `pnpm db:migrate -- --name <description>` creates and applies a named Prisma development migration.
- `pnpm db:reset` rebuilds the local database and reapplies all Prisma migrations.

Before running these commands for the first time, a developer will run `pnpm install` and create `.env` from `.env.example`. Next.js, Prisma, and the Supabase CLI will use this one ignored local environment file.

## 11. Testing Strategy

The foundation will have four test levels:

1. Unit tests will check domain rules, application use cases, environment validation, error mapping, and logging behavior.
2. Integration tests will check Prisma connectivity, transactions, and health queries against the real local Supabase PostgreSQL database. Future modules will add repository integration tests with their own product code.
3. Architecture tests will use isolated fixture files to prove that the checker rejects imports that break module, layer, or browser/server boundaries. The normal source scan will ignore these deliberately invalid fixtures.
4. Playwright tests will run against a production build and check the neutral root application shell and health behavior in a real browser.

The foundation will not include a sample business module only to demonstrate testing. `src/modules/README.md` and test guidance will explain how future modules add each test type.

`pnpm verify` will run checks in this order:

```text
Documentation structure
-> Formatting
-> ESLint
-> Architecture boundaries
-> TypeScript
-> Unit tests
-> Integration tests
-> Production build
-> Playwright smoke tests
```

Each check will fail with a clear message that states what failed and how to correct it.

## 12. Continuous Integration

GitHub Actions will call repository scripts instead of copying their logic into workflow files. Local and CI verification will therefore use the same commands.

CI will start a local Supabase database, apply Prisma migrations, and run `pnpm verify`. When a check fails, CI will preserve relevant evidence:

- Unit and integration test reports
- Playwright screenshots and browser traces
- Application logs
- Database startup logs

The initial CI workflow will build the production Docker image but will not publish or deploy it.

## 13. Documentation Checks

A TypeScript documentation-check script will validate:

- Required repository documents exist.
- Local Markdown links resolve to existing files.
- Every active execution plan contains its status, progress, decisions, and verification sections.
- Index documents link to the design and product documents they list.

The check will not attempt to decide whether prose is factually current. `docs/QUALITY.md` will record known gaps, and normal maintenance work will update stale guidance when code behavior changes.

## 14. Deployment and Security

The foundation will build one optimized production Docker image:

- It will use the Node.js runtime rather than the Edge runtime.
- It will run as a non-root operating-system user.
- It will receive secrets through server-side environment variables.
- It will validate required configuration during startup.
- It will expose the health endpoint for deployment readiness checks.

The deployment process will run migrations as a separate release step. It will stop when a migration fails and will not start the new application version against an unknown schema state.

The design will remain hosting-platform neutral. A future deployment design must define secret storage, network access to Supabase, rollback behavior, backups, and production monitoring for the selected platform.

## 15. Local Environment and Worktrees

The first version will support one active local environment at a time. The checked-in Supabase configuration will use stable local ports.

Multiple simultaneous Git worktrees would require a unique Supabase project identifier and unique ports for each worktree. The project will add this only when parallel local agent work becomes necessary. Until then, agents can use separate branches but must share or coordinate the one local Supabase stack.

## 16. Acceptance Criteria

The foundation is complete when all of the following statements are true:

- A new developer can follow `README.md` to install and start the application.
- `pnpm dev` starts the local Supabase database and Next.js application.
- The neutral application shell loads in a browser.
- The health endpoint confirms application and database availability without exposing internal details.
- Prisma can apply, reset, and verify its migration history against local Supabase even before the application has product tables.
- Architecture tests prove that invalid fixture imports fail with useful repair guidance.
- `pnpm verify` passes from a clean checkout after documented setup.
- Playwright validates the production build.
- GitHub Actions runs the same verification path and builds the Docker image.
- `AGENTS.md` acts as a short map to current repository knowledge.
- Documentation checks detect missing required files and broken internal links.
- No product-specific feature, authentication system, or unused Supabase service exists in the foundation.

## 17. Main Trade-offs

- A modular monolith gives one simple deployment, but strong import checks must prevent hidden coupling between modules.
- Prisma provides typed database access, but the team must use Prisma migrations consistently and avoid remote Dashboard schema edits.
- Local Supabase gives an environment close to the hosted database, but it requires Docker and starts more services than the application uses.
- Running the full verification command takes longer than running focused tests, so developers and agents should use focused commands while editing and `pnpm verify` before completion.
- Deferring multi-worktree isolation keeps the first foundation smaller, but it limits simultaneous local agent environments until the need justifies the extra configuration.

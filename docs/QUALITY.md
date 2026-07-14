# Quality

`pnpm verify` prepares persistent report directories and runs the complete local
quality gate. The verification runner stops at the first failure and prints the
exact command to reproduce and repair that check. It runs checks in this order:

1. Documentation structure and local links
2. Prettier formatting
3. ESLint rules
4. Architecture boundaries
5. TypeScript checks
6. Unit tests
7. Integration tests against local Supabase PostgreSQL
8. Production build
9. Playwright browser smoke tests

Each check must print a direct instruction that explains how to repair a
failure. CI calls the same repository commands and keeps relevant reports,
application logs, screenshots, and browser traces when a check fails.

The ninth check runs the existing production build through Playwright. Run
`pnpm test:e2e` when you need a new build first. Browser checks run sequentially
with one Chromium profile and never reuse an existing server.

Unit and integration test runs keep readable results in the terminal and write
JUnit XML reports to `artifacts/test-results/unit.xml` and
`artifacts/test-results/integration.xml`. JUnit is a standard XML test-report
format that CI systems can read. Run `pnpm artifacts:prepare` when a tool needs
the report directories before a test starts. This command creates missing
directories and keeps all existing evidence.

Playwright writes JUnit XML to `artifacts/test-results/playwright.xml`, its HTML
report to `artifacts/playwright/report/`, and browser attachments to
`artifacts/playwright/test-results/`. Failed browser tests retain a screenshot,
trace, and video. The production wrapper copies application output to both the
terminal and `artifacts/application.log`.

Use focused checks from [DEVELOPMENT.md](DEVELOPMENT.md) while you edit. Add a
test at the lowest useful level: unit tests for isolated behavior, integration
tests for real database boundaries, architecture tests for invalid imports,
and browser tests for user-visible production behavior.

The documentation checker validates required files, local links, document
indexes, and active-plan sections. It ignores fenced code examples and
generated dependency, artifact, and build directories. It cannot prove that
the prose remains factually current, so each code change must update affected
documents.

Delivery policy tests check the Node.js 24 multi-stage image, standalone output,
single-copy runtime stage, non-root runtime user, health check, Docker ignore
rules, checkout credential isolation, read-only CI access, job timeouts,
failure evidence, and repository-owned CI commands. The container policy
command also inspects the built image directly and requires the exact runtime
user `nextjs`.

## Final foundation acceptance

Run the guarded acceptance sequence without replacing an existing `.env`:

```bash
test -e .env || cp .env.example .env
pnpm install --frozen-lockfile
pnpm run setup
pnpm run verify
pnpm run container:build
pnpm run container:check
git status --short
```

The completed foundation maps to the approved acceptance criteria as follows:

| Acceptance criterion                                                  | Repository evidence                                                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A new developer can install and start the application.                | `README.md` provides the guarded environment copy and `pnpm run setup` steps.                          |
| `pnpm dev` starts PostgreSQL and Next.js.                             | The command starts the database-only Supabase stack before the application.                            |
| The neutral shell loads in a browser.                                 | The Playwright shell test checks the production page and heading.                                      |
| Health reports database availability safely.                          | Unit, integration, and Playwright tests check the safe body and correlation header.                    |
| Prisma manages an empty migration history.                            | Setup, reset guards, integration tests, and the baseline migration use only `prisma/migrations/`.      |
| Architecture tests reject invalid imports with repair guidance.       | Twelve fixture cases cover two valid import shapes and ten invalid boundary cases.                     |
| One ordered command verifies a prepared checkout.                     | `pnpm run verify` runs all nine approved checks and stops at the first failure.                        |
| Playwright tests the production build.                                | The web server wrapper starts `.next/standalone/server.js` and retains browser evidence on failure.    |
| CI follows the local verification path and builds the image.          | The policy-tested workflow calls repository setup, verification, build, and image inspection commands. |
| `AGENTS.md` stays a short knowledge map.                              | The documentation checker validates its links to deeper guidance.                                      |
| Documentation checks detect missing files and broken links.           | Unit fixtures and `pnpm docs:check` cover required documents, indexes, links, and plan sections.       |
| The foundation contains no product feature or extra Supabase service. | The source tree has no product module, and local configuration enables PostgreSQL only.                |

The final hardening acceptance run in the isolated worktree on 2026-07-14
produced these results:

- Frozen dependency installation passed without changing the lockfile.
- `pnpm run setup` passed. Docker showed only
  `supabase_db_agentic-coding-os`; every non-database Supabase service remained
  stopped.
- `pnpm run verify` passed all nine checks in the approved order: 12
  architecture fixtures, 129 unit tests, 3 integration tests, the production
  build, and 2 Playwright tests passed. The standalone server produced no
  launcher compatibility warning.
- `pnpm run container:build` passed without a Prisma OpenSSL warning.
- `pnpm run container:check` passed, and direct image inspection returned the
  exact runtime user `nextjs`.
- `git diff --check` passed. After the final hardening commit,
  `git status --short` returned no tracked or untracked file changes.

This foundation does not add a sample business module, product-specific tests,
performance or load tests, automatic pull-request merging, or production
deployment checks. Add these only when an approved product or production design
requires them.

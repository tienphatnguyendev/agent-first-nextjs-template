# Quality

`pnpm verify` is the complete local quality gate. It runs checks in this order:

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

Use focused checks from [DEVELOPMENT.md](DEVELOPMENT.md) while you edit. Add a
test at the lowest useful level: unit tests for isolated behavior, integration
tests for real database boundaries, architecture tests for invalid imports,
and browser tests for user-visible production behavior.

The documentation checker validates required files, local links, document
indexes, and active-plan sections. It ignores fenced code examples and
generated dependency, artifact, and build directories. It cannot prove that
the prose remains factually current, so each code change must update affected
documents.

This foundation does not add a sample business module, product-specific tests,
performance or load tests, automatic pull-request merging, or production
deployment checks. Add these only when an approved product or production design
requires them.

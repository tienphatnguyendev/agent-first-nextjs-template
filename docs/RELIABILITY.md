# Reliability

Reliability starts with clear failure behavior and evidence that another person
or agent can inspect.

Every incoming request receives a correlation ID, which is a value that links
one request to its logs and error response. Server code writes structured JSON
logs and removes secrets and sensitive values. Validation failures return safe,
specific input messages. Expected business failures use stable public error
codes. Unexpected failures return a generic response and keep technical details
in server logs.

The health endpoint checks application startup and database availability. It
returns only a simple status and no database details. Integration tests exercise
the real local Supabase PostgreSQL boundary. Production build and Playwright
checks exercise the built application. `pnpm verify` combines these checks; see
[QUALITY.md](QUALITY.md) for the order.

Prisma migrations run as a separate release step before a new application
version starts. A failed migration must stop the release. Prisma remains the
only schema and migration authority; do not add `supabase/migrations/`.

The foundation uses one local Supabase environment at a time. Isolated ports
and project identifiers for simultaneous worktrees remain outside this scope.

This foundation does not include queues, background jobs, a full metrics or
tracing system, log storage, automatic production deployment, production
monitoring, backup rules, or rollback automation. A future hosting design must
define those production controls while remaining free to choose a vendor.

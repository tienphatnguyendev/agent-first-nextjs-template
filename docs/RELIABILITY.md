# Reliability

Reliability starts with clear failure behavior and evidence that another person
or agent can inspect.

Every incoming request receives a correlation ID, which is a value that links
one request to its logs and error response. Server code writes structured JSON
logs and removes secrets and sensitive values. Validation failures return safe,
specific input messages. Expected business failures use stable public error
codes. Unexpected failures return a generic response and keep technical details
in server logs.

The `GET /api/health` endpoint checks database availability. A successful check
returns HTTP 200 with `{ "status": "ok" }`. If the database is unavailable, the
endpoint logs the internal failure and returns HTTP 503 with only
`{ "status": "unavailable", "correlationId": "..." }`. Both responses include
the same correlation ID in the `x-correlation-id` header. The endpoint never
returns database hosts, credentials, errors, stack traces, migration details,
or query data. Integration tests exercise the real local Supabase PostgreSQL
boundary. Production build and Playwright checks exercise the built
application. `pnpm verify` combines these checks; see [QUALITY.md](QUALITY.md)
for the order.

Prisma migrations run as a separate release step before a new application
version starts. A failed migration must stop the release. Prisma remains the
only schema and migration authority; do not add `supabase/migrations/`.

The foundation uses one local Supabase environment at a time. Isolated ports
and project identifiers for simultaneous worktrees remain outside this scope.

This foundation does not include queues, background jobs, a full metrics or
tracing system, log storage, automatic production deployment, production
monitoring, backup rules, or rollback automation. A future hosting design must
define those production controls while remaining free to choose a vendor.

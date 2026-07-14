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

Playwright starts the standalone production server with Node.js; it never uses
`next start`, the development server, or an existing process. The post-build
step copies `public` and `.next/static` into `.next/standalone` before the server
starts. The server wrapper copies standard output and error output to the
terminal and `artifacts/application.log`. It forwards `SIGINT` and `SIGTERM`
once, stops the child server when the wrapper exits, and reports the exact failed
command with repair guidance. Browser failures retain a screenshot, trace,
video, HTML report, JUnit report, and application log for investigation.

Prisma migrations run as a separate release step before a new application
version starts. A failed migration must stop the release. Prisma remains the
only schema and migration authority; do not add `supabase/migrations/`.

The production image contains a Docker health check that calls
`GET /api/health` on port 3000. The image therefore reports failure when the
application or its database connection is unavailable. The final image starts
the standalone Next.js server with Node.js and runs as the non-root `nextjs`
user. `pnpm run container:check` inspects the image user and prints a repair
instruction when the image is missing or unsafe.

GitHub Actions gives verification 30 minutes and container checks 20 minutes.
It cancels an older run for the same branch when a newer run starts. On failure,
it keeps `artifacts/` for 14 days, including test reports, Playwright evidence,
application output, and the Supabase startup log. It does not publish, deploy,
or automatically roll back an image.

The foundation uses one local Supabase environment at a time. Isolated ports
and project identifiers for simultaneous worktrees remain outside this scope.

This foundation does not include queues, background jobs, a full metrics or
tracing system, log storage, automatic production deployment, production
monitoring, backup rules, or rollback automation. A future hosting design must
define those production controls while remaining free to choose a vendor.

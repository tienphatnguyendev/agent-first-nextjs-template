# Security

Treat all browser input, environment values, and external data as untrusted.
Validate data with Zod at the browser/server boundary before an application use
case handles it. Keep database, environment, and logging code in server-only
modules. Architecture and TypeScript checks help prevent browser imports of
server code.

Keep real secrets only in the ignored `.env` file or the selected production
secret system. `.env.example` contains safe examples only. Never expose or log
`DATABASE_URL` or `DIRECT_URL`. `DATABASE_URL` serves normal application
traffic. `DIRECT_URL` gives Prisma a direct connection for migrations and
administrative commands.

This foundation uses Supabase Database only. It does not use Supabase Auth,
Storage, Realtime, Edge Functions, Studio, the Data API, or a browser Supabase
client. Prisma is the sole application schema and migration authority. Store
migrations in `prisma/migrations/`, never `supabase/migrations/`, and do not
change the schema through a remote dashboard.

Logs must remove database credentials, authorization values, and sensitive
request data. Browser responses must not contain SQL, stack traces, internal
paths, or secret values. Use correlation IDs to connect safe error responses to
server evidence.

The `GET /api/health` route passes database failures only to the safe server
logger. Its HTTP 503 response contains only an unavailable status and a
correlation ID. The response must not contain a database host, credentials, the
raw error, a stack trace, migration details, or query data. Both healthy and
unavailable responses copy the request correlation ID into the
`x-correlation-id` header.

The production Docker build uses separate dependency, build, and runtime
stages. The post-build step places `public` and static Next.js files inside the
standalone output. The final stage copies that complete output once and runs as
the non-root `nextjs` operating-system user. Use
`pnpm run container:check` to inspect this policy after every image build. The
shared build stage installs OpenSSL for Prisma generation and removes the
package-list cache. The final runtime stage does not install this build tool.

`.dockerignore` keeps `.env` files, dependencies, build output, test evidence,
and local Supabase state outside the build context. It allows only the safe
`.env.example` contract. Prisma generation uses a fixed local placeholder URL
inside the build stage. The runtime stage does not contain that placeholder,
and the build accepts no database secret argument. Pass real server values only
through the selected runtime secret system.

The CI workflow grants read-only repository access. It never passes
`DATABASE_URL`, `DIRECT_URL`, or another secret into `docker build`. It builds
and inspects the image, but it does not publish or deploy it.

Use `pnpm lint`, `pnpm typecheck`, architecture checks, unit tests, integration
tests, and `pnpm verify` to check these controls. A passing check does not replace
a security review for a real product.

This foundation does not provide authentication, authorization, product data
rules, a production secret vendor, network policy, or a complete threat model.
A threat model is a written review of possible attacks and defenses. Define
these controls when the product and hosting design become known. Production
hosting remains vendor neutral.

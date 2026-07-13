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

Use `pnpm lint`, `pnpm typecheck`, architecture checks, unit tests, integration
tests, and `pnpm verify` to check these controls. A passing check does not replace
a security review for a real product.

This foundation does not provide authentication, authorization, product data
rules, a production secret vendor, network policy, or a complete threat model.
A threat model is a written review of possible attacks and defenses. Define
these controls when the product and hosting design become known. Production
hosting remains vendor neutral.

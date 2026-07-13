# Architecture

This repository contains one deployable Next.js application. It uses a modular
monolith: one application with clear internal modules. This structure keeps
deployment simple and prevents unrelated code from mixing.

## Main areas

- `src/app/` contains Next.js routes and composes public module interfaces.
- `src/modules/` contains future product modules. This foundation does not add
  a product module or example business feature.
- `src/platform/` contains shared server infrastructure, such as environment
  validation, logging, database access, and HTTP support.
- `src/shared/` contains generic, framework-free code.

Each product module exposes its supported interface from `index.ts`. Next.js
routes and other modules must use this public interface. They must not import a
module's private files.

## Module layers

Every future module has four layers:

1. `domain/` contains business rules and types. It does not import Next.js,
   React, Prisma, platform code, or external service clients.
2. `application/` contains use cases and interfaces for required
   infrastructure. It can import only the module's domain layer.
3. `infrastructure/` implements the application interfaces. It can import the
   application and domain layers and server code from `src/platform/`.
4. `ui/` contains React components and server actions. It can call application
   use cases and use the module's public types.

Dependencies point toward business rules: UI and infrastructure depend on the
application layer, and the application layer depends on the domain layer. The
domain layer does not depend on an outer layer. `src/shared/` cannot depend on
product modules or platform implementations. Browser code cannot import
server-only environment, database, or logging code.

## Request flow

A normal request follows this path:

```text
Browser
  -> Next.js route, server action, or server component
  -> Zod validation at the browser/server boundary
  -> module application use case
  -> module repository interface
  -> Prisma repository implementation
  -> Supabase PostgreSQL
```

Zod checks untrusted input before the use case runs. The infrastructure layer
maps Prisma records to domain objects and safe response values. It never sends
raw Prisma records, SQL errors, secrets, or server environment values to the
browser.

## Database boundary

This foundation uses Supabase Database only. The application does not use
Supabase Auth, Storage, Realtime, Edge Functions, Studio, the Data API, or a
browser Supabase client.

Prisma is the sole authority for the application schema and migrations. All
schema changes belong in `prisma/schema.prisma` and `prisma/migrations/`. Do not
create `supabase/migrations/` or change the schema through a remote dashboard.

`DATABASE_URL` carries normal application traffic. `DIRECT_URL` gives Prisma a
direct connection for migrations and administrative commands. Both values stay
on the server and must never appear in source code, browser bundles, or logs.

Production hosting stays neutral. A future deployment design must choose its
own hosting, secret storage, network, backup, monitoring, and rollback details
without changing the module boundaries.

See the [approved foundation design](docs/superpowers/specs/2026-07-13-agent-first-modular-monolith-design.md)
for the complete design context.

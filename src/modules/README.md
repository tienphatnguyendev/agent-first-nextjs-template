# Product module guide

This folder will contain product modules. A module groups one business area and
keeps its rules, use cases, technical code, and user interface together. The
application remains one deployable system.

Use this exact shape for every future module:

```text
<module>/
├── domain/
├── application/
├── infrastructure/
├── ui/
└── index.ts
```

The directories have these import rules:

- `domain/` contains business rules and plain TypeScript types. It must not
  import React, Next.js, Prisma, another layer, or an external service client.
- `application/` contains use cases and interfaces that describe required
  technical work. It can import only the module's `domain/` code.
- `infrastructure/` implements application interfaces for databases and
  external services. It can import `application/`, `domain/`, and server code
  from `src/platform/`.
- `ui/` contains React components and server actions. It can use application
  use cases and the module's public types. A client file must not reach server
  database, environment, or logging code.
- `index.ts` exposes only the interfaces that the module intentionally makes
  public. Keep internal helpers and implementation details private.

Code in `src/app/` and other modules must import a module through its public
`index.ts`. They must not import files from the module's private directories.
Code in `src/shared/` must remain independent from modules and platform code.

Run `pnpm architecture` after changing imports. When a rule fails, read its
`Repair:` instruction and move the import to the stated public interface or
layer.

# Agent-First Modular Monolith Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable, agent-first, full-stack TypeScript foundation as one deployable Next.js modular monolith backed only by Supabase PostgreSQL.

**Architecture:** One Next.js App Router application contains product modules under `src/modules/`, shared server infrastructure under `src/platform/`, and framework composition under `src/app/`. Prisma owns the application schema and migrations; Supabase provides local and hosted PostgreSQL. Repository documents, architecture rules, tests, logs, and stable commands give people and coding agents direct feedback.

**Tech Stack:** Node.js 24+, pnpm 10+, Next.js App Router, React, strict TypeScript, Supabase CLI with PostgreSQL 17, Prisma ORM 7 with `@prisma/adapter-pg`, Zod 4, Pino, Vitest 4, React Testing Library, dependency-cruiser, Playwright, Docker, and GitHub Actions.

## Global Constraints

- Keep one deployable application. Do not add Turborepo or a workspace monorepo.
- Use Supabase Database only. Do not add Supabase Auth, Storage, Realtime, Edge Functions, Studio, Data API usage, or a browser Supabase client.
- Keep Prisma as the only application schema and migration authority. Do not create `supabase/migrations/`.
- Do not add product modules, example business features, authentication, billing, email, queues, or background jobs.
- Use PostgreSQL 17 locally to match current new Supabase projects.
- Keep production hosting neutral. Build and test the image, but do not publish or deploy it.
- Support one local Supabase environment at a time. Document that isolated multi-worktree ports and project identifiers are outside this foundation.
- Use `.env` for ignored local values and `.env.example` for safe examples. Never commit `.env`.
- Use `DATABASE_URL` for application traffic and `DIRECT_URL` for migrations. Never expose either value to browser code or logs.
- For a serverless production host, use the Supabase transaction pooler for `DATABASE_URL` and a direct connection for `DIRECT_URL`.
- Create the Prisma client lazily at request time. A production build must not require real database secrets.
- Keep `AGENTS.md` short and use it only as a map to deeper repository documents.
- Make each check print a direct repair instruction.
- Write a failing test before behavior, run it to confirm the expected failure, add the minimum implementation, rerun the focused test, and commit the independently testable result.
- Use the official current setup models: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Prisma 7 with Next.js](https://www.prisma.io/docs/guides/frameworks/nextjs), [Supabase CLI startup exclusions](https://supabase.com/docs/reference/cli/supabase-functions-delete), and [Playwright web server](https://playwright.dev/docs/test-webserver).

---

## Locked File Map

The tasks below own these files. A later task may modify a file only when its `Files` section says so.

```text
.
├── .github/workflows/ci.yml              # Local-equivalent CI and artifacts
├── .dependency-cruiser.cjs               # Import boundary policy
├── .dockerignore                         # Production image input policy
├── .env.example                          # Safe local and production variable contract
├── .gitignore                            # Generated and secret files
├── .node-version                         # Node.js 24 tool hint
├── .nvmrc                                # Node.js 24 tool hint
├── .prettierignore                       # Formatter exclusions
├── .prettierrc.json                       # Formatter policy
├── AGENTS.md                              # Short repository map
├── ARCHITECTURE.md                        # Module and dependency rules
├── Dockerfile                             # Non-root multi-stage production image
├── README.md                              # Human entry point
├── docs/                                  # Version-controlled repository knowledge
├── eslint.config.mjs                      # ESLint flat configuration
├── next.config.ts                         # Next.js standalone output
├── package.json                           # Stable commands and dependencies
├── playwright.config.ts                   # Production browser checks and artifacts
├── pnpm-lock.yaml                         # Exact dependency resolution
├── prisma.config.ts                       # Prisma CLI uses DIRECT_URL
├── prisma/                                # Prisma schema and migration history
├── scripts/                               # Agent-readable local and CI commands
├── src/app/                               # Next.js routes and composition
├── src/modules/README.md                  # Required shape for future product modules
├── src/platform/                          # Environment, logs, database, HTTP, and health
├── src/proxy.ts                           # Correlation ID propagation
├── src/shared/                            # Framework-free generic code
├── supabase/config.toml                   # Local PostgreSQL 17 configuration
├── tests/                                 # Unit, integration, architecture, delivery, E2E
├── tsconfig.json                          # Strict TypeScript and @/* alias
├── vitest.config.ts                       # Unit and policy test configuration
└── vitest.integration.config.ts           # Sequential real-database tests
```

---

### Task 1: Bootstrap the strict Next.js application and neutral shell

**Files:**

- Create: `.node-version`
- Create: `.nvmrc`
- Create: `package.json`
- Create through install: `pnpm-lock.yaml`
- Create: `next-env.d.ts`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `eslint.config.mjs`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `.gitignore`
- Create: `vitest.config.ts`
- Create: `tests/setup/vitest.ts`
- Create: `tests/setup/server-only.ts`
- Create: `tests/unit/app/page.test.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `public/.gitkeep`

**Interfaces:**

- Consumes: no earlier application code.
- Produces: the `@/* -> src/*` alias, strict TypeScript, `pnpm build`, `pnpm test:unit`, and a root page with the heading `Agent-First Modular Monolith`.

- [ ] **Step 1: Create the package and tool configuration**

Create `.node-version` and `.nvmrc` with the single line `24`.

Create `package.json`:

```json
{
  "name": "agentic-coding-os",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.18.0",
  "engines": {
    "node": ">=24.0.0",
    "pnpm": ">=10.0.0"
  },
  "scripts": {
    "dev:app": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --max-warnings=0",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test:unit": "vitest run --config vitest.config.ts"
  }
}
```

Install the initial dependencies:

```bash
pnpm add next@latest react@latest react-dom@latest pino@latest zod@4 server-only@latest
pnpm add -D typescript@latest @types/node@latest @types/react@latest @types/react-dom@latest eslint@latest eslint-config-next@latest prettier@latest vitest@4 jsdom@latest @vitejs/plugin-react@latest vite-tsconfig-paths@latest @testing-library/react@latest @testing-library/jest-dom@latest tsx@latest
```

Expected: pnpm creates `pnpm-lock.yaml`; `pnpm exec next --version` and `pnpm exec vitest --version` exit 0.

- [ ] **Step 2: Configure TypeScript, Next.js, ESLint, Prettier, and Vitest**

Use strict TypeScript in `tsconfig.json`, set `moduleResolution` to `bundler`, enable `noUncheckedIndexedAccess`, and map `@/*` to `./src/*`. Use Next.js's flat ESLint configuration in `eslint.config.mjs`. Configure Prettier with semicolons, double quotes, trailing commas, and an 80-character width.

Create `vitest.config.ts`:

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      "server-only": path.join(root, "tests/setup/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/scripts/**/*.test.ts",
      "tests/architecture/**/*.test.ts",
      "tests/delivery/**/*.test.ts"
    ],
    setupFiles: ["tests/setup/vitest.ts"],
    reporters: ["default"],
  },
});
```

Create `tests/setup/vitest.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create an empty `tests/setup/server-only.ts`. Add `.env`, `.next/`, `node_modules/`, `src/generated/prisma/`, `supabase/.branches/`, `supabase/.temp/`, `artifacts/`, `playwright-report/`, and `test-results/` to `.gitignore`.

- [ ] **Step 3: Write the failing root-page test**

```tsx
// tests/unit/app/page.test.tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders a neutral foundation shell", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        name: "Agent-First Modular Monolith",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ready for the first product module."),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the test and confirm the expected failure**

Run:

```bash
pnpm test:unit -- tests/unit/app/page.test.tsx
```

Expected: FAIL because `@/app/page` does not exist.

- [ ] **Step 5: Add the minimum application shell**

```tsx
// src/app/page.tsx
export default function HomePage() {
  return (
    <main aria-labelledby="page-title">
      <h1 id="page-title">Agent-First Modular Monolith</h1>
      <p>Ready for the first product module.</p>
    </main>
  );
}
```

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Agent-First Modular Monolith",
  description: "A reusable full-stack application foundation.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Keep `globals.css` small: use system fonts, a readable line height, a centered `main` with a maximum width, and no design system or product branding.

- [ ] **Step 6: Verify and commit the shell**

Run:

```bash
pnpm test:unit -- tests/unit/app/page.test.tsx
pnpm lint
pnpm typecheck
pnpm build
```

Expected: one page test passes; lint, type checking, and the production build exit 0.

```bash
git add .node-version .nvmrc package.json pnpm-lock.yaml next-env.d.ts next.config.ts tsconfig.json eslint.config.mjs .prettierrc.json .prettierignore .gitignore vitest.config.ts tests/setup tests/unit/app src/app public
git commit -m "feat: scaffold neutral Next.js application shell"
```

---

### Task 2: Add safe server environment validation

**Files:**

- Create: `.env.example`
- Create: `src/platform/env/server.ts`
- Create: `src/platform/env/index.ts`
- Test: `tests/unit/platform/env/server.test.ts`

**Interfaces:**

- Consumes: Zod and the `server-only` guard.
- Produces: `parseServerEnv(source): ServerEnv`, `getServerEnv(): ServerEnv`, and `EnvironmentValidationError`.
- `ServerEnv` contains `NODE_ENV`, `LOG_LEVEL`, `DATABASE_URL`, and `DIRECT_URL`.

- [ ] **Step 1: Write the failing environment tests**

```ts
// tests/unit/platform/env/server.test.ts
import { describe, expect, it } from "vitest";

import {
  EnvironmentValidationError,
  parseServerEnv,
} from "@/platform/env/server";

const localUrl =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public";

describe("parseServerEnv", () => {
  it("accepts the complete server contract", () => {
    expect(
      parseServerEnv({
        NODE_ENV: "test",
        LOG_LEVEL: "info",
        DATABASE_URL: localUrl,
        DIRECT_URL: localUrl,
      }),
    ).toEqual({
      NODE_ENV: "test",
      LOG_LEVEL: "info",
      DATABASE_URL: localUrl,
      DIRECT_URL: localUrl,
    });
  });

  it("names invalid variables without exposing their values", () => {
    const secret = "postgresql://user:very-secret@example.com/app";

    expect(() =>
      parseServerEnv({ DATABASE_URL: secret, DIRECT_URL: "" }),
    ).toThrow(EnvironmentValidationError);

    try {
      parseServerEnv({ DATABASE_URL: secret, DIRECT_URL: "" });
    } catch (error) {
      expect(String(error)).toContain("DIRECT_URL");
      expect(String(error)).not.toContain("very-secret");
    }
  });
});
```

- [ ] **Step 2: Run the test and confirm the expected failure**

Run `pnpm test:unit -- tests/unit/platform/env/server.test.ts`.

Expected: FAIL because `src/platform/env/server.ts` does not exist.

- [ ] **Step 3: Implement lazy, redacted environment validation**

```ts
// src/platform/env/server.ts
import "server-only";

import { z } from "zod";

const postgresUrl = z.string().min(1).refine(
  (value) => {
    try {
      return ["postgres:", "postgresql:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  },
  { message: "must be a PostgreSQL URL" },
);

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  DATABASE_URL: postgresUrl,
  DIRECT_URL: postgresUrl,
});

export type ServerEnv = z.infer<typeof schema>;

export class EnvironmentValidationError extends Error {
  constructor(readonly variables: readonly string[]) {
    super(`Invalid server environment variables: ${variables.join(", ")}`);
    this.name = "EnvironmentValidationError";
  }
}

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  const result = schema.safeParse(source);
  if (!result.success) {
    const variables = [
      ...new Set(
        result.error.issues.map((issue) => String(issue.path[0])),
      ),
    ].sort();
    throw new EnvironmentValidationError(variables);
  }
  return result.data;
}

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
```

```ts
// src/platform/env/index.ts
export {
  EnvironmentValidationError,
  getServerEnv,
  parseServerEnv,
  type ServerEnv,
} from "./server";
```

Create `.env.example`:

```dotenv
NODE_ENV=development
LOG_LEVEL=info
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public"

# In serverless production, DATABASE_URL uses the Supabase transaction pooler.
# DIRECT_URL stays a direct connection for Prisma migration commands.
```

- [ ] **Step 4: Verify and commit environment validation**

Run:

```bash
pnpm test:unit -- tests/unit/platform/env/server.test.ts
pnpm typecheck
```

Expected: two tests pass and TypeScript exits 0 without requiring a real `.env` during build.

```bash
git add .env.example src/platform/env tests/unit/platform/env/server.test.ts
git commit -m "feat: validate server environment safely"
```

---

### Task 3: Add redacted JSON logging and correlation IDs

**Files:**

- Create: `src/platform/logging/correlation-id.ts`
- Create: `src/platform/logging/logger.ts`
- Create: `src/platform/logging/index.ts`
- Create: `src/platform/errors/app-error.ts`
- Create: `src/platform/errors/index.ts`
- Create: `src/proxy.ts`
- Test: `tests/unit/platform/logging/logger.test.ts`
- Test: `tests/unit/platform/logging/correlation-id.test.ts`
- Test: `tests/unit/platform/errors/app-error.test.ts`
- Test: `tests/unit/proxy.test.ts`

**Interfaces:**

- Consumes: `getServerEnv()` only when the application requests the singleton logger.
- Produces: `CORRELATION_ID_HEADER`, `getOrCreateCorrelationId()`, `createLogger()`, `getLogger()`, `AppError`, and Next.js `proxy()`.

- [ ] **Step 1: Write failing tests for correlation IDs, redaction, and public errors**

Use these central assertions:

```ts
const createId = () => "generated-id";
expect(getOrCreateCorrelationId("request-123", createId)).toBe("request-123");
expect(getOrCreateCorrelationId("bad id", createId)).toBe("generated-id");

const secretUrl = "postgresql://user:secret@db.example.com/app";
const chunks: string[] = [];
const logger = createLogger(
  {
    LOG_LEVEL: "info",
    DATABASE_URL: secretUrl,
    DIRECT_URL: secretUrl,
  },
  { write: (chunk: string) => chunks.push(chunk) },
);
logger.error(
  {
    err: new Error(`connection failed for ${secretUrl}`),
    authorization: "Bearer token",
    databaseUrl: secretUrl,
  },
  "request failed",
);
const destinationOutput = chunks.join("");
expect(destinationOutput).toContain("[Redacted]");
expect(destinationOutput).not.toContain("Bearer token");
expect(destinationOutput).not.toContain(secretUrl);

expect(new AppError("NOT_FOUND", "Resource not found", 404)).toMatchObject({
  code: "NOT_FOUND",
  status: 404,
  isOperational: true,
});
```

The proxy test must pass a `NextRequest`, assert that downstream request headers contain `x-correlation-id`, and assert that the response returns the same header.

- [ ] **Step 2: Run the tests and confirm missing-module failures**

```bash
pnpm test:unit -- tests/unit/platform/logging tests/unit/platform/errors tests/unit/proxy.test.ts
```

Expected: FAIL because logging, error, and proxy modules do not exist.

- [ ] **Step 3: Implement the correlation and error primitives**

```ts
// src/platform/logging/correlation-id.ts
import { randomUUID } from "node:crypto";

export const CORRELATION_ID_HEADER = "x-correlation-id";
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function getOrCreateCorrelationId(
  candidate: string | null | undefined,
  createId: () => string = randomUUID,
): string {
  return candidate && SAFE_ID.test(candidate) ? candidate : createId();
}
```

```ts
// src/platform/errors/app-error.ts
export class AppError extends Error {
  readonly isOperational = true;

  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AppError";
  }
}
```

- [ ] **Step 4: Implement Pino with explicit secret redaction and lazy startup**

```ts
// src/platform/logging/logger.ts
import "server-only";

import pino, {
  type DestinationStream,
  type Logger,
  type LoggerOptions,
} from "pino";

import { getServerEnv, type ServerEnv } from "@/platform/env";

const REDACTED_PATHS = [
  "authorization",
  "cookie",
  "password",
  "secret",
  "token",
  "databaseUrl",
  "directUrl",
  "req.headers.authorization",
  "req.headers.cookie",
  "requestBody",
];

export function createLogger(
  env: Pick<
    ServerEnv,
    "LOG_LEVEL" | "DATABASE_URL" | "DIRECT_URL"
  >,
  destination?: DestinationStream,
): Logger {
  const sensitiveValues = [env.DATABASE_URL, env.DIRECT_URL];
  const redactText = (value: string | undefined) =>
    sensitiveValues.reduce(
      (result, secret) => result.replaceAll(secret, "[Redacted]"),
      value ?? "",
    );
  const options: LoggerOptions = {
    level: env.LOG_LEVEL,
    redact: { paths: REDACTED_PATHS, censor: "[Redacted]" },
    base: undefined,
    serializers: {
      err(value) {
        if (!(value instanceof Error)) return value;
        return {
          type: value.name,
          message: redactText(value.message),
          stack: redactText(value.stack),
        };
      },
    },
  };

  return destination ? pino(options, destination) : pino(options);
}

let logger: Logger | undefined;

export function getLogger(): Logger {
  logger ??= createLogger(getServerEnv());
  return logger;
}
```

```ts
// src/platform/logging/index.ts
export {
  CORRELATION_ID_HEADER,
  getOrCreateCorrelationId,
} from "./correlation-id";
export { createLogger, getLogger } from "./logger";

// src/platform/errors/index.ts
export { AppError } from "./app-error";
```

- [ ] **Step 5: Implement Next.js correlation propagation**

```ts
// src/proxy.ts
import { type NextRequest, NextResponse } from "next/server";

import {
  CORRELATION_ID_HEADER,
  getOrCreateCorrelationId,
} from "@/platform/logging/correlation-id";

export function proxy(request: NextRequest) {
  const correlationId = getOrCreateCorrelationId(
    request.headers.get(CORRELATION_ID_HEADER),
  );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CORRELATION_ID_HEADER, correlationId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CORRELATION_ID_HEADER, correlationId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 6: Verify and commit logging and correlation**

```bash
pnpm test:unit -- tests/unit/platform/logging tests/unit/platform/errors tests/unit/proxy.test.ts
pnpm typecheck
```

Expected: all focused tests pass; logs contain valid JSON and redact sensitive keys; TypeScript exits 0.

```bash
git add src/platform/logging src/platform/errors src/proxy.ts tests/unit/platform/logging tests/unit/platform/errors tests/unit/proxy.test.ts
git commit -m "feat: add correlated and redacted server logging"
```

---

### Task 4: Create the repository knowledge system and documentation checker

**Files:**

- Create: `AGENTS.md`
- Create: `ARCHITECTURE.md`
- Create: `README.md`
- Create: `docs/DEVELOPMENT.md`
- Create: `docs/PLANS.md`
- Create: `docs/QUALITY.md`
- Create: `docs/RELIABILITY.md`
- Create: `docs/SECURITY.md`
- Create: `docs/decisions/README.md`
- Create: `docs/design-docs/README.md`
- Create: `docs/exec-plans/README.md`
- Create: `docs/exec-plans/active/README.md`
- Create: `docs/exec-plans/completed/README.md`
- Create: `docs/product-specs/README.md`
- Create: `docs/references/README.md`
- Create: `scripts/check-docs.ts`
- Test: `tests/scripts/check-docs.test.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: the approved design and stable commands defined by Tasks 1–3.
- Produces: `checkDocumentation(root): DocIssue[]`, `pnpm docs:check`, and the required four sections for active execution plans.

- [ ] **Step 1: Write the failing documentation-policy test**

Create a temporary repository in the test. Write the complete required document set, then remove `docs/SECURITY.md`, insert one broken local link, add one unindexed design document, and add an active plan without required sections.

```ts
expect(new Set(checkDocumentation(root).map((issue) => issue.code))).toEqual(
  new Set([
    "required-document-missing",
    "broken-local-link",
    "document-not-indexed",
    "active-plan-section-missing",
  ]),
);
```

Run `pnpm test:unit -- tests/scripts/check-docs.test.ts`.

Expected: FAIL because `scripts/check-docs.ts` does not exist.

- [ ] **Step 2: Implement the documentation checker**

```ts
// scripts/check-docs.ts
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface DocIssue {
  code: string;
  path: string;
  message: string;
}

export const REQUIRED_DOCUMENTS = [
  "AGENTS.md",
  "ARCHITECTURE.md",
  "README.md",
  "docs/DEVELOPMENT.md",
  "docs/PLANS.md",
  "docs/QUALITY.md",
  "docs/RELIABILITY.md",
  "docs/SECURITY.md",
  "docs/decisions/README.md",
  "docs/design-docs/README.md",
  "docs/exec-plans/README.md",
  "docs/exec-plans/active/README.md",
  "docs/exec-plans/completed/README.md",
  "docs/product-specs/README.md",
  "docs/references/README.md",
] as const;

const ACTIVE_SECTIONS = ["Status", "Progress", "Decisions", "Verification"];
const INDEXED_DIRECTORIES = ["docs/design-docs", "docs/product-specs"];

function markdownFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.name.endsWith(".md") ? [path] : [];
  });
}

function linkTargets(markdown: string): string[] {
  const prose = markdown.replace(/```[\s\S]*?```/g, "");
  return [...prose.matchAll(/\[[^\]]*]\(([^)]+)\)/g)]
    .map((match) => match[1].trim().replace(/^<|>$/g, ""))
    .filter(
      (target) =>
        !target.startsWith("#") &&
        !target.startsWith("http://") &&
        !target.startsWith("https://") &&
        !target.startsWith("mailto:"),
    )
    .map((target) => decodeURIComponent(target.split("#", 1)[0]));
}

export function checkDocumentation(root: string): DocIssue[] {
  const issues: DocIssue[] = [];

  for (const required of REQUIRED_DOCUMENTS) {
    if (!existsSync(resolve(root, required))) {
      issues.push({
        code: "required-document-missing",
        path: required,
        message: `Create ${required} and link it from the repository map.`,
      });
    }
  }

  const documents = [
    ...REQUIRED_DOCUMENTS.map((path) => resolve(root, path)),
    ...markdownFiles(resolve(root, "docs")),
  ].filter(
    (path, index, all) => existsSync(path) && all.indexOf(path) === index,
  );
  for (const document of documents) {
    const markdown = readFileSync(document, "utf8");
    for (const target of linkTargets(markdown)) {
      if (!existsSync(resolve(dirname(document), target))) {
        issues.push({
          code: "broken-local-link",
          path: relative(root, document),
          message: `Local link "${target}" does not resolve.`,
        });
      }
    }
  }

  for (const plan of markdownFiles(resolve(root, "docs/exec-plans/active"))) {
    if (basename(plan) === "README.md") continue;
    const markdown = readFileSync(plan, "utf8");
    for (const section of ACTIVE_SECTIONS) {
      if (!new RegExp(`^## ${section}\\s*$`, "im").test(markdown)) {
        issues.push({
          code: "active-plan-section-missing",
          path: relative(root, plan),
          message: `Add the "## ${section}" section.`,
        });
      }
    }
  }

  for (const indexedDirectory of INDEXED_DIRECTORIES) {
    const directory = resolve(root, indexedDirectory);
    const index = resolve(directory, "README.md");
    if (!existsSync(index) || !statSync(directory).isDirectory()) continue;
    const linked = new Set(
      linkTargets(readFileSync(index, "utf8")).map((target) =>
        resolve(directory, target),
      ),
    );
    for (const document of markdownFiles(directory)) {
      if (document !== index && !linked.has(document)) {
        issues.push({
          code: "document-not-indexed",
          path: relative(root, document),
          message: `Link this document from ${relative(root, index)}.`,
        });
      }
    }
  }

  return issues;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const issues = checkDocumentation(process.cwd());
  for (const issue of issues) {
    console.error(`[${issue.code}] ${issue.path}: ${issue.message}`);
  }
  if (issues.length > 0) process.exitCode = 1;
  else console.log("Documentation structure is valid.");
}
```

- [ ] **Step 3: Create the repository map and complete document outlines**

Use this exact `AGENTS.md` structure and keep it under 100 lines:

```markdown
# Repository Map

Start with [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

## Stable commands

- `pnpm setup` prepares Supabase Database, Prisma, and Playwright.
- `pnpm dev` starts the database and application.
- `pnpm verify` runs every required check.
- `pnpm test` runs unit and integration tests.
- `pnpm test:e2e` builds and tests the production application.
- `pnpm db:migrate -- --name <description>` creates a migration.
- `pnpm db:reset` rebuilds only the local database.

## Knowledge map

- [Architecture](ARCHITECTURE.md)
- [Development](docs/DEVELOPMENT.md)
- [Active plans](docs/exec-plans/active/README.md)
- [Plan rules](docs/PLANS.md)
- [Quality](docs/QUALITY.md)
- [Reliability](docs/RELIABILITY.md)
- [Security](docs/SECURITY.md)

Keep product code inside its module. Import another module only through its
`index.ts`. Never expose database or server environment code to the browser.
```

Write complete, concise content for each required document. `ARCHITECTURE.md` must define the four module layers, allowed dependency directions, and the request flow from browser boundary validation through application use cases and infrastructure to PostgreSQL. `docs/DEVELOPMENT.md` must explain setup, focused checks, the one-active-local-environment limit, and why multi-worktree Supabase isolation is excluded. `docs/PLANS.md` must define the four active-plan sections. `docs/QUALITY.md`, `docs/RELIABILITY.md`, and `docs/SECURITY.md` must state the checks and the explicit exclusions in this foundation. Each directory `README.md` must state what belongs there. `docs/design-docs/README.md` must link to the approved design under `docs/superpowers/specs/`.

- [ ] **Step 4: Add and verify the stable documentation command**

Add `"docs:check": "tsx scripts/check-docs.ts"` to `package.json`.

Run:

```bash
pnpm test:unit -- tests/scripts/check-docs.test.ts
pnpm docs:check
```

Expected: the unit test passes and the command prints `Documentation structure is valid.`

- [ ] **Step 5: Commit the knowledge system**

```bash
git add AGENTS.md ARCHITECTURE.md README.md docs scripts/check-docs.ts tests/scripts/check-docs.test.ts package.json
git commit -m "docs: add repository knowledge map and checks"
```

---

### Task 5: Enforce modular architecture with executable repair guidance

**Files:**

- Create: `src/modules/README.md`
- Create: `.dependency-cruiser.cjs`
- Create: `scripts/check-architecture-fixtures.ts`
- Create: `tests/architecture/architecture-fixtures.test.ts`
- Create fixture trees under: `tests/architecture/fixtures/`
- Modify: `package.json`
- Modify: `ARCHITECTURE.md`

**Interfaces:**

- Consumes: `tsconfig.json` and the module rules from the approved design.
- Produces: `pnpm architecture:source`, `pnpm architecture:fixtures`, and `pnpm architecture`.

- [ ] **Step 1: Create six fixture trees and the failing fixture test**

Create one fixture for each case:

1. `valid-public-import` imports another module through `index.ts` and must pass.
2. `app-private-import` imports a module private file and must fail.
3. `cross-module-private-import` imports another module's private file and must fail.
4. `domain-framework-import` imports React inside `domain/` and must fail.
5. `shared-platform-import` imports database code from `shared/` and must fail.
6. `client-server-import` uses a `*.client.tsx` file that reaches database code and must fail.

The test must assert exit code 0 for the valid fixture. Each invalid fixture must return a nonzero code, its named rule, and the word `Repair:`.

Run `pnpm test:unit -- tests/architecture/architecture-fixtures.test.ts`.

Expected: FAIL because the fixture runner does not exist.

- [ ] **Step 2: Add the dependency rules**

Create `.dependency-cruiser.cjs` with these required rule names and conditions:

```js
module.exports = {
  forbidden: [
    {
      name: "no-app-private-module-imports",
      severity: "error",
      comment: "Repair: import the module through src/modules/<module>/index.ts.",
      from: { path: "(^|/)src/app(/|$)" },
      to: { path: "(^|/)src/modules/[^/]+/(?!index\\.[cm]?[jt]sx?$).+" },
    },
    {
      name: "no-private-cross-module-imports",
      severity: "error",
      comment: "Repair: import the other module through its public index.ts.",
      from: { path: "(^|/)src/modules/([^/]+)(/|$)" },
      to: {
        path: "(^|/)src/modules/[^/]+(/|$)",
        pathNot: [
          "(^|/)src/modules/$2(/|$)",
          "(^|/)src/modules/[^/]+/index\\.[cm]?[jt]sx?$",
        ],
      },
    },
    {
      name: "no-domain-framework-imports",
      severity: "error",
      comment: "Repair: pass plain values through an application interface.",
      from: { path: "(^|/)src/modules/[^/]+/domain(/|$)" },
      to: { path: "(^|node_modules/)(next|react|@prisma/client)(/|$)" },
    },
    {
      name: "no-domain-outer-layer-imports",
      severity: "error",
      comment: "Repair: make outer layers depend on domain, never the reverse.",
      from: { path: "(^|/)src/modules/[^/]+/domain(/|$)" },
      to: { path: "(^|/)src/modules/[^/]+/(application|infrastructure|ui)(/|$)" },
    },
    {
      name: "no-application-outer-layer-imports",
      severity: "error",
      comment: "Repair: define an interface in application and implement it in infrastructure.",
      from: { path: "(^|/)src/modules/[^/]+/application(/|$)" },
      to: { path: "(^|/)src/modules/[^/]+/(infrastructure|ui)(/|$)" },
    },
    {
      name: "no-shared-module-or-platform-imports",
      severity: "error",
      comment: "Repair: move this behavior into a module or explicit platform service.",
      from: { path: "(^|/)src/shared(/|$)" },
      to: { path: "(^|/)src/(modules|platform)(/|$)" },
    },
    {
      name: "no-client-server-imports",
      severity: "error",
      comment: "Repair: keep server access behind a server component, route, or action.",
      from: { path: "\\.client\\.[cm]?[jt]sx?$" },
      to: {
        path: "(^|/)src/platform/(database|env|logging)(/|$)",
        reachable: true,
      },
    },
    {
      name: "no-circular-dependencies",
      severity: "error",
      comment: "Repair: extract a one-way interface instead of keeping a cycle.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-unresolved-dependencies",
      severity: "error",
      comment: "Repair: correct the import path or declare the dependency.",
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
  },
};
```

The `from` expression stores the module name in capture group `$2` because group `$1` represents the optional path prefix.

- [ ] **Step 3: Add the fixture runner and module authoring guide**

The runner must use `spawnSync` to call dependency-cruiser once per fixture, pass that fixture's `src` path, and require the expected exit code and rule. Print the original dependency-cruiser output so an agent receives each `Repair:` comment.

`src/modules/README.md` must include the exact future shape:

```text
<module>/
├── domain/
├── application/
├── infrastructure/
├── ui/
└── index.ts
```

It must define what each directory can import and state that a module exposes only intentional interfaces from `index.ts`.

Add scripts:

```json
{
  "architecture:source": "depcruise src --config .dependency-cruiser.cjs --output-type err-long",
  "architecture:fixtures": "tsx scripts/check-architecture-fixtures.ts",
  "architecture": "pnpm architecture:source && pnpm architecture:fixtures"
}
```

- [ ] **Step 4: Verify and commit the architecture policy**

```bash
pnpm test:unit -- tests/architecture/architecture-fixtures.test.ts
pnpm architecture
pnpm typecheck
```

Expected: one valid fixture passes, five invalid fixtures fail for their expected rule, the real `src/` tree has no violations, and TypeScript exits 0.

```bash
git add .dependency-cruiser.cjs scripts/check-architecture-fixtures.ts tests/architecture src/modules/README.md ARCHITECTURE.md package.json
git commit -m "test: enforce modular architecture boundaries"
```

---

### Task 6: Configure database-only Supabase, Prisma migrations, and safe database commands

**Files:**

- Create: `supabase/config.toml`
- Create: `prisma/schema.prisma`
- Create: `prisma.config.ts`
- Create: `prisma/migrations/migration_lock.toml`
- Create: `prisma/migrations/20260713000000_init/migration.sql`
- Create: `scripts/database.ts`
- Create: `src/platform/database/client.ts`
- Create: `src/platform/database/health.ts`
- Create: `src/platform/database/index.ts`
- Create: `vitest.integration.config.ts`
- Create: `tests/integration/setup.ts`
- Create: `tests/integration/database.test.ts`
- Test: `tests/unit/database/migration-authority.test.ts`
- Test: `tests/unit/scripts/database.test.ts`
- Test: `tests/unit/platform/database/health.test.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: `getServerEnv()` from Task 2.
- Produces: `getDatabase(): PrismaClient`, `checkDatabaseAvailability(client?): Promise<void>`, `pnpm db:start`, `pnpm db:setup`, `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:reset`, `pnpm db:deploy`, `pnpm test:integration`, and temporary `pnpm setup`/`pnpm dev` wrappers.

- [ ] **Step 1: Install database dependencies and write failing policy tests**

```bash
pnpm add @prisma/client@7 @prisma/adapter-pg@7 pg@8 dotenv@latest
pnpm add -D prisma@7 supabase@latest @types/pg@latest
```

Test these exact policies:

```ts
expect(existsSync(resolve("supabase/migrations"))).toBe(false);
expect(readFileSync("supabase/config.toml", "utf8")).toContain(
  "major_version = 17",
);
expect(() =>
  assertLocalDirectUrl(
    "postgresql://postgres:secret@db.example.com:5432/postgres",
  ),
).toThrow("DIRECT_URL must point to local Supabase on port 54322");

const healthyClient = {
  $queryRaw: vi.fn().mockResolvedValue([{ result: 1 }]),
} as unknown as PrismaClient;
await expect(
  checkDatabaseAvailability(healthyClient),
).resolves.toBeUndefined();

const invalidClient = {
  $queryRaw: vi.fn().mockResolvedValue([{ result: 0 }]),
} as unknown as PrismaClient;
await expect(checkDatabaseAvailability(invalidClient)).rejects.toThrow(
  "Database health query returned an invalid result.",
);
```

Run:

```bash
pnpm test:unit -- tests/unit/database/migration-authority.test.ts tests/unit/scripts/database.test.ts tests/unit/platform/database/health.test.ts
```

Expected: FAIL because the Supabase, Prisma, script, and database files do not exist.

- [ ] **Step 2: Configure only local PostgreSQL 17**

```toml
# supabase/config.toml
project_id = "agentic-coding-os"

[api]
enabled = false

[db]
port = 54322
shadow_port = 54320
major_version = 17

[db.pooler]
enabled = false

[db.seed]
enabled = false

[auth]
enabled = false

[realtime]
enabled = false

[storage]
enabled = false

[studio]
enabled = false

[edge_runtime]
enabled = false
```

The start command must also exclude every non-database container supported by the CLI: `gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor`.

- [ ] **Step 3: Configure Prisma 7 and the empty baseline migration**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

```ts
// prisma.config.ts
import "dotenv/config";

import { defineConfig } from "prisma/config";

const generationOnlyUrl =
  "postgresql://build:build@127.0.0.1:5432/build";
const directUrl = process.env.DIRECT_URL ??
  (process.argv.includes("generate") ? generationOnlyUrl : undefined);

if (!directUrl) {
  throw new Error("DIRECT_URL is required for Prisma migration commands.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: directUrl },
});
```

Create `prisma/migrations/migration_lock.toml` with `provider = "postgresql"`. Create `prisma/migrations/20260713000000_init/migration.sql` with comments that establish Prisma as the only application migration authority and intentionally create no product table.

- [ ] **Step 4: Implement safe database lifecycle commands**

In `scripts/database.ts`, export:

```ts
export type DatabaseAction = "start" | "setup" | "migrate" | "reset";
export interface Command { bin: string; args: string[] }
export function assertLocalDirectUrl(value: string): void;
export function buildDatabaseCommands(
  action: DatabaseAction,
  args: string[],
  directUrl: string,
): Command[];
```

`buildDatabaseCommands("start", [], "")` must return:

```ts
[
  { bin: "docker", args: ["info"] },
  {
    bin: "pnpm",
    args: [
      "exec",
      "supabase",
      "start",
      "--exclude",
      "gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor",
    ],
  },
]
```

The `setup` action appends `prisma generate` and `prisma migrate deploy`. The `migrate` action requires `--name <lowercase_description>`, starts the local database, and runs `prisma migrate dev`. The `reset` action calls `assertLocalDirectUrl` before running `prisma migrate reset --force`. Use `spawnSync` with inherited output, stop on the first nonzero exit, and print the exact failed command.

Add these scripts:

```json
{
  "setup": "pnpm db:setup",
  "dev": "pnpm db:start && pnpm dev:app",
  "db:start": "tsx scripts/database.ts start",
  "db:setup": "tsx scripts/database.ts setup",
  "db:generate": "prisma generate",
  "db:deploy": "prisma migrate deploy",
  "db:migrate": "tsx scripts/database.ts migrate",
  "db:reset": "tsx scripts/database.ts reset"
}
```

- [ ] **Step 5: Implement a lazy Prisma client and throwable health probe**

```ts
// src/platform/database/client.ts
import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/platform/env";

const globalDatabase = globalThis as unknown as {
  database?: PrismaClient;
};

export function getDatabase(): PrismaClient {
  if (!globalDatabase.database) {
    const adapter = new PrismaPg({
      connectionString: getServerEnv().DATABASE_URL,
    });
    globalDatabase.database = new PrismaClient({ adapter });
  }
  return globalDatabase.database;
}
```

```ts
// src/platform/database/health.ts
import type { PrismaClient } from "@/generated/prisma/client";

import { getDatabase } from "./client";

export async function checkDatabaseAvailability(
  client: PrismaClient = getDatabase(),
): Promise<void> {
  const rows = await client.$queryRaw<Array<{ result: number }>>`
    SELECT 1::integer AS "result"
  `;
  if (rows[0]?.result !== 1) {
    throw new Error("Database health query returned an invalid result.");
  }
}
```

```ts
// src/platform/database/index.ts
export { getDatabase } from "./client";
export { checkDatabaseAvailability } from "./health";
```

The lazy function prevents `next build` from parsing database secrets or opening connections.

- [ ] **Step 6: Add sequential real-database tests**

Configure `vitest.integration.config.ts` for Node, one worker, no file parallelism, and `tests/integration/**/*.test.ts`. Tests must:

1. Call `checkDatabaseAvailability()` successfully.
2. Complete an interactive transaction and return `txid_current()` as digits.
3. Query `_prisma_migrations` and confirm `20260713000000_init` finished.

Add `"test:integration": "vitest run --config vitest.integration.config.ts"` and `"test": "pnpm test:unit && pnpm test:integration"`.

- [ ] **Step 7: Verify database behavior and commit**

If `.env` does not exist, copy `.env.example` to `.env`. Preserve an existing `.env`; never overwrite it from a setup script.

```bash
pnpm db:generate
pnpm test:unit -- tests/unit/database/migration-authority.test.ts tests/unit/scripts/database.test.ts tests/unit/platform/database/health.test.ts
pnpm db:setup
pnpm test:integration
pnpm exec prisma migrate status
```

Expected: all unit and integration tests pass; Prisma reports the schema is up to date; `supabase/migrations/` remains absent. Do not commit `src/generated/prisma/`.

```bash
git add package.json pnpm-lock.yaml supabase prisma prisma.config.ts scripts/database.ts src/platform/database vitest.integration.config.ts tests/unit/database tests/unit/scripts/database.test.ts tests/unit/platform/database tests/integration .gitignore
git commit -m "feat: add Supabase PostgreSQL and Prisma lifecycle"
```

---

### Task 7: Expose a safe, correlated database health endpoint

**Files:**

- Create: `src/platform/health/handler.ts`
- Create: `src/platform/health/index.ts`
- Create: `src/app/api/health/route.ts`
- Test: `tests/unit/platform/health/handler.test.ts`
- Modify: `docs/RELIABILITY.md`
- Modify: `docs/SECURITY.md`

**Interfaces:**

- Consumes: `checkDatabaseAvailability()`, `getLogger()`, `CORRELATION_ID_HEADER`, and `getOrCreateCorrelationId()`.
- Produces: `createHealthHandler(dependencies)`, `GET /api/health`, HTTP 200 `{ "status": "ok" }`, and safe HTTP 503 responses.

- [ ] **Step 1: Write the failing handler tests**

```ts
// tests/unit/platform/health/handler.test.ts
import { describe, expect, it, vi } from "vitest";

import { createHealthHandler } from "@/platform/health/handler";

describe("health handler", () => {
  it("returns a simple healthy response and correlation header", async () => {
    const response = await createHealthHandler({
      checkDatabaseAvailability: vi.fn().mockResolvedValue(undefined),
      getCorrelationId: async () => "request-123",
      logFailure: vi.fn(),
    })();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
    expect(response.headers.get("x-correlation-id")).toBe("request-123");
  });

  it("logs details but returns no database details", async () => {
    const failure = new Error("database host db.internal password=secret");
    const logFailure = vi.fn();
    const response = await createHealthHandler({
      checkDatabaseAvailability: vi.fn().mockRejectedValue(failure),
      getCorrelationId: async () => "request-456",
      logFailure,
    })();

    expect(response.status).toBe(503);
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({
      status: "unavailable",
      correlationId: "request-456",
    });
    expect(logFailure).toHaveBeenCalledWith("request-456", failure);
    expect(body).not.toContain("db.internal");
    expect(body).not.toContain("secret");
  });
});
```

- [ ] **Step 2: Run the test and confirm the expected failure**

Run `pnpm test:unit -- tests/unit/platform/health/handler.test.ts`.

Expected: FAIL because `src/platform/health/handler.ts` does not exist.

- [ ] **Step 3: Implement the framework-light handler**

```ts
// src/platform/health/handler.ts
import "server-only";

import { CORRELATION_ID_HEADER } from "@/platform/logging/correlation-id";

export interface HealthDependencies {
  checkDatabaseAvailability(): Promise<void>;
  getCorrelationId(): Promise<string>;
  logFailure(correlationId: string, error: unknown): void;
}

export function createHealthHandler(dependencies: HealthDependencies) {
  return async function handleHealth(): Promise<Response> {
    const correlationId = await dependencies.getCorrelationId();
    const headers = {
      "content-type": "application/json",
      [CORRELATION_ID_HEADER]: correlationId,
    };

    try {
      await dependencies.checkDatabaseAvailability();
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers,
      });
    } catch (error) {
      dependencies.logFailure(correlationId, error);
      return new Response(
        JSON.stringify({ status: "unavailable", correlationId }),
        { status: 503, headers },
      );
    }
  };
}
```

```ts
// src/platform/health/index.ts
export {
  createHealthHandler,
  type HealthDependencies,
} from "./handler";
```

- [ ] **Step 4: Compose the Next.js route without eager database access**

```ts
// src/app/api/health/route.ts
import { headers } from "next/headers";

import { checkDatabaseAvailability } from "@/platform/database";
import { createHealthHandler } from "@/platform/health";
import {
  CORRELATION_ID_HEADER,
  getLogger,
  getOrCreateCorrelationId,
} from "@/platform/logging";

export const runtime = "nodejs";

export const GET = createHealthHandler({
  checkDatabaseAvailability,
  getCorrelationId: async () =>
    getOrCreateCorrelationId(
      (await headers()).get(CORRELATION_ID_HEADER),
    ),
  logFailure: (correlationId, error) => {
    getLogger().error(
      { err: error, correlationId },
      "health check failed",
    );
  },
});
```

Export the public health and logging names from their `index.ts` files. Do not call `getDatabase()` at module import time.

- [ ] **Step 5: Verify the endpoint and commit**

```bash
pnpm test:unit -- tests/unit/platform/health/handler.test.ts
pnpm db:setup
pnpm dev:app
```

In a second terminal, run:

```bash
curl --fail-with-body http://127.0.0.1:3000/api/health
```

Expected: the test passes; curl returns `{"status":"ok"}` with HTTP 200; the response includes `x-correlation-id`; no response contains database details.

```bash
git add src/platform/health src/platform/logging/index.ts src/platform/database/index.ts src/app/api/health docs/RELIABILITY.md docs/SECURITY.md tests/unit/platform/health
git commit -m "feat: add safe database health endpoint"
```

---

### Task 8: Add ordered verification, formatting, and persistent test reports

**Files:**

- Create: `scripts/prepare-artifacts.ts`
- Create: `scripts/verify.ts`
- Test: `tests/scripts/verify.test.ts`
- Modify: `package.json`
- Modify: `vitest.config.ts`
- Modify: `vitest.integration.config.ts`
- Modify: `.gitignore`
- Modify: `docs/QUALITY.md`
- Modify: `docs/DEVELOPMENT.md`

**Interfaces:**

- Consumes: `docs:check`, `format:check`, `lint`, `architecture`, `typecheck`, `test:unit`, `test:integration`, `build`, and a future `test:e2e:run`.
- Produces: `CHECKS`, `runVerification()`, `pnpm artifacts:prepare`, and `pnpm verify`.

- [ ] **Step 1: Write the failing order and repair-message tests**

```ts
// tests/scripts/verify.test.ts
import { describe, expect, it, vi } from "vitest";

import { CHECKS, runVerification } from "../../scripts/verify";

describe("runVerification", () => {
  it("stops at the first failure and gives a repair command", () => {
    const calls: string[] = [];
    const runner = vi.fn((script: string) => {
      calls.push(script);
      return script === "lint" ? 1 : 0;
    });

    expect(() => runVerification(runner)).toThrow(
      "ESLint failed. Reproduce and repair it with: pnpm lint",
    );
    expect(calls).toEqual(["docs:check", "format:check", "lint"]);
  });

  it("runs the complete approved order", () => {
    const calls: string[] = [];
    runVerification((script) => {
      calls.push(script);
      return 0;
    });
    expect(calls).toEqual(CHECKS.map(({ script }) => script));
  });
});
```

Run `pnpm test:unit -- tests/scripts/verify.test.ts`.

Expected: FAIL because `scripts/verify.ts` does not exist.

- [ ] **Step 2: Implement the ordered gate**

```ts
// scripts/verify.ts
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface VerificationCheck {
  label: string;
  script: string;
  repair: string;
}

export type CommandRunner = (script: string) => number;

export const CHECKS: readonly VerificationCheck[] = [
  { label: "Documentation structure", script: "docs:check", repair: "pnpm docs:check" },
  { label: "Formatting", script: "format:check", repair: "pnpm format" },
  { label: "ESLint", script: "lint", repair: "pnpm lint" },
  { label: "Architecture boundaries", script: "architecture", repair: "pnpm architecture" },
  { label: "TypeScript", script: "typecheck", repair: "pnpm typecheck" },
  { label: "Unit tests", script: "test:unit", repair: "pnpm test:unit" },
  { label: "Integration tests", script: "test:integration", repair: "pnpm test:integration" },
  { label: "Production build", script: "build", repair: "pnpm build" },
  { label: "Playwright smoke tests", script: "test:e2e:run", repair: "pnpm test:e2e" },
];

const defaultRunner: CommandRunner = (script) =>
  spawnSync("pnpm", [script], { stdio: "inherit" }).status ?? 1;

export function runVerification(runner: CommandRunner = defaultRunner): void {
  for (const check of CHECKS) {
    console.log(`\n==> ${check.label}`);
    if (runner(check.script) !== 0) {
      throw new Error(
        `${check.label} failed. Reproduce and repair it with: ${check.repair}`,
      );
    }
  }
  console.log("\nAll repository checks passed.");
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    runVerification();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
```

- [ ] **Step 3: Prepare artifact directories and reporters**

`scripts/prepare-artifacts.ts` must create `artifacts/test-results/` and `artifacts/playwright/` with `mkdirSync(..., { recursive: true })`. Do not delete existing evidence at startup.

Configure unit and integration Vitest runs to write JUnit reports to `artifacts/test-results/unit.xml` and `artifacts/test-results/integration.xml`. Add these scripts:

```json
{
  "artifacts:prepare": "tsx scripts/prepare-artifacts.ts",
  "verify": "pnpm artifacts:prepare && tsx scripts/verify.ts"
}
```

- [ ] **Step 4: Run focused checks before E2E exists**

```bash
pnpm test:unit -- tests/scripts/verify.test.ts
pnpm format
pnpm format:check
pnpm lint
pnpm architecture
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
```

Expected: every command exits 0. Do not run the complete `pnpm verify` until Task 9 creates `test:e2e:run`.

- [ ] **Step 5: Commit the ordered verification harness**

```bash
git add scripts/prepare-artifacts.ts scripts/verify.ts tests/scripts/verify.test.ts package.json vitest.config.ts vitest.integration.config.ts .gitignore docs/QUALITY.md docs/DEVELOPMENT.md
git commit -m "chore: add ordered repository verification"
```

---

### Task 9: Test the production application with Playwright and complete setup

**Files:**

- Create: `playwright.config.ts`
- Create: `scripts/setup.ts`
- Create: `scripts/start-production-for-e2e.ts`
- Test: `tests/unit/scripts/setup.test.ts`
- Create: `tests/e2e/smoke.spec.ts`
- Modify: `package.json`
- Modify: `docs/DEVELOPMENT.md`
- Modify: `docs/QUALITY.md`
- Modify: `docs/RELIABILITY.md`

**Interfaces:**

- Consumes: `pnpm db:setup`, `pnpm build`, `pnpm start`, `/`, and `/api/health`.
- Produces: final `pnpm setup`, `pnpm test:e2e`, `pnpm test:e2e:run`, browser traces, screenshots, video, JUnit XML, HTML report, and application logs.

- [ ] **Step 1: Install Playwright and write the failing setup-command test**

```bash
pnpm add -D @playwright/test@latest
```

The test must assert that `buildSetupCommands(false)` returns `pnpm db:setup` and `pnpm exec playwright install chromium`, while `buildSetupCommands(true)` adds `--with-deps` before `chromium`. It must also verify that setup never creates or overwrites `.env`.

Run `pnpm test:unit -- tests/unit/scripts/setup.test.ts`.

Expected: FAIL because `scripts/setup.ts` does not exist.

- [ ] **Step 2: Implement setup with explicit failures**

`scripts/setup.ts` must export `buildSetupCommands(ci: boolean): Command[]`, execute each command with inherited output, stop on the first failure, and print this message when `.env` is absent:

```text
Create .env from .env.example before running pnpm setup.
```

The two commands are:

```ts
[
  { bin: "pnpm", args: ["db:setup"] },
  {
    bin: "pnpm",
    args: [
      "exec",
      "playwright",
      "install",
      ...(ci ? ["--with-deps"] : []),
      "chromium",
    ],
  },
]
```

Change `setup` to `tsx scripts/setup.ts` in `package.json`.

- [ ] **Step 3: Write the browser tests before adding their server configuration**

```ts
// tests/e2e/smoke.spec.ts
import { expect, test } from "@playwright/test";

test("loads the neutral production shell", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Agent-First Modular Monolith" }),
  ).toBeVisible();
});

test("returns only the safe health status", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
  expect(response.headers()["x-correlation-id"]).toBeTruthy();
});
```

Run `pnpm exec playwright test tests/e2e/smoke.spec.ts`.

Expected: FAIL because no production web server starts.

- [ ] **Step 4: Configure production browser testing and evidence**

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  outputDir: "artifacts/playwright/test-results",
  reporter: [
    ["line"],
    ["html", { outputFolder: "artifacts/playwright/report", open: "never" }],
    ["junit", { outputFile: "artifacts/test-results/playwright.xml" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "pnpm start:e2e-server",
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
```

`scripts/start-production-for-e2e.ts` must create `artifacts/application.log`, spawn `pnpm start`, copy stdout and stderr to both the terminal and log file, forward `SIGINT` and `SIGTERM`, and exit with the child status.

Add scripts:

```json
{
  "start:e2e-server": "tsx scripts/start-production-for-e2e.ts",
  "test:e2e": "pnpm build && pnpm test:e2e:run",
  "test:e2e:run": "playwright test"
}
```

- [ ] **Step 5: Run the complete local feedback loop**

```bash
pnpm setup
pnpm test:e2e
pnpm verify
```

Expected: two Playwright checks pass; the full verification command runs all nine checks in the approved order and prints `All repository checks passed.`

- [ ] **Step 6: Prove failure evidence once, restore the test, and commit**

Temporarily change the expected root heading in the local test to an incorrect value and run `pnpm test:e2e:run`. Expected: a nonzero exit plus a screenshot, trace, video, HTML report, JUnit report, and `artifacts/application.log`. Restore the correct heading and rerun `pnpm test:e2e:run` before committing.

```bash
git add playwright.config.ts scripts/setup.ts scripts/start-production-for-e2e.ts tests/unit/scripts/setup.test.ts tests/e2e package.json pnpm-lock.yaml docs/DEVELOPMENT.md docs/QUALITY.md docs/RELIABILITY.md
git commit -m "test: add production Playwright smoke checks"
```

---

### Task 10: Add a secure production image, policy-tested CI, and final verification

**Files:**

- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `.github/workflows/ci.yml`
- Create: `scripts/check-container.ts`
- Test: `tests/delivery/delivery-config.test.ts`
- Modify: `next.config.ts`
- Modify: `package.json`
- Modify: `docs/SECURITY.md`
- Modify: `docs/RELIABILITY.md`
- Modify: `docs/QUALITY.md`
- Modify: `README.md`

**Interfaces:**

- Consumes: the standalone Next.js build, `pnpm setup`, `pnpm verify`, and `/api/health`.
- Produces: `agentic-coding-os:ci`, runtime user `nextjs`, `pnpm container:build`, `pnpm container:check`, and CI artifact `verification-artifacts`.

- [ ] **Step 1: Write the failing delivery-policy test**

Assert all of these conditions:

- `Dockerfile` has at least three named stages based on Node.js 24.
- The final stage contains `USER nextjs`, `HEALTHCHECK`, and standalone Next.js copies.
- The image never copies `.env` and contains no real database URL or secret build argument.
- CI uses Node.js 24, calls `pnpm setup`, `pnpm verify`, `pnpm container:build`, and `pnpm container:check`.
- CI uses `permissions: contents: read` and uploads `artifacts/` only on failure.

Run `pnpm test:unit -- tests/delivery/delivery-config.test.ts`.

Expected: FAIL because the delivery files do not exist.

- [ ] **Step 2: Configure standalone Next.js output and the non-root image**

Set `output: "standalone"` in `next.config.ts`.

```dockerfile
# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN DIRECT_URL=postgresql://build:build@127.0.0.1:5432/build pnpm db:generate
RUN pnpm build

FROM node:24-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]
CMD ["node", "server.js"]
```

The build-only URL is a fixed non-secret placeholder and does not enter the final stage. `.dockerignore` must exclude `.git`, `.env*` except `.env.example`, `.next`, `node_modules`, `artifacts`, test reports, and local Supabase state.

- [ ] **Step 3: Add the container policy command**

`scripts/check-container.ts` must run:

```ts
spawnSync(
  "docker",
  ["image", "inspect", image, "--format", "{{.Config.User}}"],
  { encoding: "utf8" },
);
```

It must fail unless the output is exactly `nextjs`. Add:

```json
{
  "container:build": "docker build --target runner --tag agentic-coding-os:ci .",
  "container:check": "tsx scripts/check-container.ts agentic-coding-os:ci"
}
```

- [ ] **Step 4: Add CI that calls repository-owned commands**

Create `.github/workflows/ci.yml` with two jobs:

1. `verify` checks out code, installs pnpm, uses Node.js 24 with pnpm caching, installs the lockfile, prepares artifact directories, copies `.env.example` to `.env`, runs `pnpm setup` with `set -o pipefail` and tees output to `artifacts/supabase-start.log`, then runs `pnpm verify`. On failure it uploads `artifacts/` for 14 days.
2. `container` depends on `verify`, installs Node.js 24 and pnpm, runs `pnpm install --frozen-lockfile`, `pnpm container:build`, and `pnpm container:check`. It never passes database secrets into the build.

Use `pull_request` and pushes to `main`, read-only repository contents permission, cancellation of older runs for the same branch, a 30-minute verification timeout, and a 20-minute container timeout.

- [ ] **Step 5: Verify delivery policy and the image**

```bash
pnpm test:unit -- tests/delivery/delivery-config.test.ts
pnpm container:build
pnpm container:check
docker image inspect agentic-coding-os:ci --format '{{.Config.User}}'
```

Expected: the policy test passes, the image builds, the policy command exits 0, and inspection prints `nextjs`.

- [ ] **Step 6: Run the final clean-checkout acceptance sequence**

From a clean checkout with Docker running:

```bash
cp .env.example .env
pnpm install --frozen-lockfile
pnpm setup
pnpm verify
pnpm container:build
pnpm container:check
git status --short
```

Expected:

- Setup starts only Supabase PostgreSQL, generates Prisma, applies the empty baseline migration, and installs Chromium.
- Verification passes all nine checks in the approved order.
- The secure image builds and runs as `nextjs`.
- `git status --short` prints nothing. Generated Prisma code, `.env`, build output, and artifacts remain ignored.

- [ ] **Step 7: Commit the delivery foundation**

```bash
git add Dockerfile .dockerignore .github/workflows/ci.yml scripts/check-container.ts tests/delivery/delivery-config.test.ts next.config.ts package.json docs/SECURITY.md docs/RELIABILITY.md docs/QUALITY.md README.md
git commit -m "ci: verify foundation and build secure container"
```

---

## Implementation Completion Check

After Task 10, compare the result with every acceptance criterion in the approved design. Record the final commands and results in `docs/QUALITY.md`. Keep this plan under `docs/superpowers/plans/` as implementation history; use `docs/exec-plans/active/` only for future long-running product work that needs progress and decision logs.

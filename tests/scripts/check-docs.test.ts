import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { checkDocumentation } from "../../scripts/check-docs";

const requiredDocuments = [
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

const completeActivePlan = `# Plan

## Status

Active.

## Progress

Not started.

## Decisions

None.

## Verification

Not run.
`;

const temporaryRoots: string[] = [];

function writeDocument(root: string, path: string, contents = "# Document\n") {
  const fullPath = join(root, path);
  mkdirSync(join(fullPath, ".."), { recursive: true });
  writeFileSync(fullPath, contents);
}

function createCompleteRepository(): string {
  const root = mkdtempSync(join(tmpdir(), "check-docs-"));
  temporaryRoots.push(root);

  for (const document of requiredDocuments) {
    writeDocument(root, document);
  }

  writeDocument(root, "docs/design-docs/indexed-design.md");
  writeDocument(
    root,
    "docs/design-docs/README.md",
    "# Design documents\n\n- [Indexed design](indexed-design.md)\n",
  );
  writeDocument(
    root,
    "docs/exec-plans/active/indexed-plan.md",
    completeActivePlan,
  );

  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe("checkDocumentation", () => {
  it("reports each documentation policy failure with a repair instruction", () => {
    const root = createCompleteRepository();

    unlinkSync(join(root, "docs/SECURITY.md"));
    writeDocument(root, "README.md", "# Repository\n\n[Missing](missing.md)\n");
    writeDocument(root, "docs/design-docs/unindexed-design.md");
    writeDocument(
      root,
      "docs/exec-plans/active/incomplete-plan.md",
      "# Incomplete plan\n",
    );

    const issues = checkDocumentation(root);

    expect(new Set(issues.map((issue) => issue.code))).toEqual(
      new Set([
        "required-document-missing",
        "broken-local-link",
        "document-not-indexed",
        "active-plan-section-missing",
      ]),
    );
    expect(issues.every((issue) => issue.message.length > 0)).toBe(true);
    expect(
      issues.find((issue) => issue.code === "required-document-missing")
        ?.message,
    ).toContain("Create docs/SECURITY.md");
    expect(
      issues.find((issue) => issue.code === "broken-local-link")?.message,
    ).toContain("Update or remove");
    expect(
      issues.find((issue) => issue.code === "document-not-indexed")?.message,
    ).toContain("Link this document");
    expect(
      issues.find((issue) => issue.code === "active-plan-section-missing")
        ?.message,
    ).toContain('Add the "## Status" section');
  });

  it("ignores local-link examples inside fenced code", () => {
    const root = createCompleteRepository();

    writeDocument(
      root,
      "docs/QUALITY.md",
      `# Quality

\`\`\`markdown
[Backtick example](missing-backtick.md)
\`\`\`

~~~markdown
[Tilde example](missing-tilde.md)
~~~
`,
    );

    expect(checkDocumentation(root)).toEqual([]);
  });

  it("ignores generated Markdown in dependency, artifact, and build folders", () => {
    const root = createCompleteRepository();

    for (const directory of [
      "node_modules",
      "artifacts",
      "build",
      "dist",
      ".next",
    ]) {
      writeDocument(
        root,
        `docs/design-docs/${directory}/generated.md`,
        "[Generated broken link](missing.md)\n",
      );
    }

    expect(checkDocumentation(root)).toEqual([]);
  });
});

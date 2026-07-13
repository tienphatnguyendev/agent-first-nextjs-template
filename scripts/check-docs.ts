import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
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
const IGNORED_DIRECTORIES = new Set([
  ".next",
  "artifacts",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

interface LocalLink {
  target: string;
  decodedPath: string | null;
}

function markdownFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) return [];

    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.name.endsWith(".md") ? [path] : [];
  });
}

function withoutFencedCode(markdown: string): string {
  let fence: { character: "`" | "~"; length: number } | undefined;

  return markdown
    .split("\n")
    .map((line) => {
      if (fence) {
        const closingFence = new RegExp(
          `^ {0,3}\\${fence.character}{${fence.length},}\\s*$`,
        );
        if (closingFence.test(line)) fence = undefined;
        return "";
      }

      const openingFence = line.match(/^ {0,3}(`{3,}|~{3,})/);
      if (openingFence?.[1]) {
        fence = {
          character: openingFence[1][0] as "`" | "~",
          length: openingFence[1].length,
        };
        return "";
      }

      return line;
    })
    .join("\n");
}

function linkTargets(markdown: string): LocalLink[] {
  const prose = withoutFencedCode(markdown);

  return [...prose.matchAll(/\[[^\]]*]\(([^)]+)\)/g)]
    .map((match) => match[1]?.trim().replace(/^<|>$/g, "") ?? "")
    .filter(
      (target) =>
        target.length > 0 &&
        !target.startsWith("#") &&
        !target.startsWith("http://") &&
        !target.startsWith("https://") &&
        !target.startsWith("mailto:"),
    )
    .map((target) => {
      try {
        return {
          target,
          decodedPath: decodeURIComponent(target.split(/[?#]/, 1)[0] ?? ""),
        };
      } catch {
        return { target, decodedPath: null };
      }
    });
}

function isInsideRoot(root: string, path: string): boolean {
  const pathFromRoot = relative(resolve(root), path);
  return (
    pathFromRoot === "" ||
    (pathFromRoot !== ".." &&
      !pathFromRoot.startsWith(`..${sep}`) &&
      !isAbsolute(pathFromRoot))
  );
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
    for (const link of linkTargets(markdown)) {
      if (link.decodedPath === null) {
        issues.push({
          code: "broken-local-link",
          path: relative(root, document),
          message: `Update or remove local link "${link.target}"; its percent encoding is invalid.`,
        });
        continue;
      }

      const target = resolve(dirname(document), link.decodedPath);
      if (!isInsideRoot(root, target)) {
        issues.push({
          code: "broken-local-link",
          path: relative(root, document),
          message: `Update or remove local link "${link.target}"; local links must stay inside the repository.`,
        });
        continue;
      }

      if (!existsSync(target)) {
        issues.push({
          code: "broken-local-link",
          path: relative(root, document),
          message: `Update or remove local link "${link.target}"; it does not resolve.`,
        });
      }
    }
  }

  for (const plan of markdownFiles(resolve(root, "docs/exec-plans/active"))) {
    if (basename(plan) === "README.md") continue;

    const markdown = withoutFencedCode(readFileSync(plan, "utf8"));
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
      linkTargets(readFileSync(index, "utf8")).flatMap((link) =>
        link.decodedPath === null ? [] : [resolve(directory, link.decodedPath)],
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

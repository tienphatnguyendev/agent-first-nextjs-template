import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const ruleName = "client-directive-requires-client-filename";
const sourceExtension = /\.[cm]?[jt]sx?$/;
const clientFilename = /\.client\.[cm]?[jt]sx?$/;

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && sourceExtension.test(entry.name) ? [path] : [];
  });
}

function hasUseClientDirective(path: string): boolean {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    false,
  );

  for (const statement of source.statements) {
    if (
      !ts.isExpressionStatement(statement) ||
      !ts.isStringLiteral(statement.expression)
    ) {
      return false;
    }
    if (statement.expression.text === "use client") return true;
  }

  return false;
}

export function checkClientDirectiveFileNames(
  sourceRoot: string,
  writeError: (message: string) => void = (message) =>
    process.stderr.write(message),
): number {
  const violations = sourceFiles(sourceRoot).filter(
    (path) => hasUseClientDirective(path) && !clientFilename.test(path),
  );

  for (const path of violations) {
    writeError(
      `error ${ruleName}: ${relative(sourceRoot, path)}\n` +
        '  Repair: rename the file to use the .client.* suffix, or move "use client" into a .client.* entry file.\n',
    );
  }

  return violations.length === 0 ? 0 : 1;
}

const entrypoint = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entrypoint === fileURLToPath(import.meta.url)) {
  process.exitCode = checkClientDirectiveFileNames(
    resolve(process.argv[2] ?? "src"),
  );
}

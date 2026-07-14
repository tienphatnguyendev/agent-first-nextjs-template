import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { checkClientDirectiveFileNames } from "../../scripts/check-client-directives";

function createSourceTree(files: Readonly<Record<string, string>>): string {
  const root = mkdtempSync(join(tmpdir(), "client-directive-source-"));
  for (const [path, source] of Object.entries(files)) {
    const destination = join(root, path);
    mkdirSync(join(destination, ".."), { recursive: true });
    writeFileSync(destination, source);
  }
  return root;
}

describe("client directive filename check", () => {
  it("rejects a real top-level directive outside a .client file", () => {
    const root = createSourceTree({
      "account.tsx": '"use client";\nexport const account = "safe";\n',
    });
    const messages: string[] = [];

    try {
      expect(
        checkClientDirectiveFileNames(root, (message) =>
          messages.push(message),
        ),
      ).toBe(1);
      expect(messages.join("")).toContain(
        "client-directive-requires-client-filename",
      );
      expect(messages.join("")).toContain("account.tsx");
      expect(messages.join("")).toContain("Repair:");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("ignores comments and unrelated strings and allows a .client file", () => {
    const root = createSourceTree({
      "comment.tsx": '// "use client"\nexport const label = "use client";\n',
      "account.client.tsx": '"use client";\nexport const account = "safe";\n',
    });
    const messages: string[] = [];

    try {
      expect(
        checkClientDirectiveFileNames(root, (message) =>
          messages.push(message),
        ),
      ).toBe(0);
      expect(messages).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

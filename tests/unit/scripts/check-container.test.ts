import { describe, expect, it, vi } from "vitest";

import { runContainerCheck } from "../../../scripts/check-container";

describe("runContainerCheck", () => {
  it("inspects the requested image with an argument-array command", () => {
    const spawn = vi.fn().mockReturnValue({
      status: 0,
      signal: null,
      stdout: "nextjs\n",
      stderr: "",
    });
    const writeError = vi.fn();

    expect(
      runContainerCheck("agentic-coding-os:ci", { spawn, writeError }),
    ).toBe(0);
    expect(spawn).toHaveBeenCalledWith(
      "docker",
      [
        "image",
        "inspect",
        "agentic-coding-os:ci",
        "--format",
        "{{.Config.User}}",
      ],
      { encoding: "utf8" },
    );
    expect(writeError).not.toHaveBeenCalled();
  });

  it("rejects a missing image with repair guidance", () => {
    const spawn = vi.fn();
    const messages: string[] = [];

    expect(
      runContainerCheck(undefined, {
        spawn,
        writeError: (message) => messages.push(message),
      }),
    ).toBe(1);
    expect(spawn).not.toHaveBeenCalled();
    expect(messages.join("")).toContain("Container image is required.");
    expect(messages.join("")).toContain("Repair:");
  });

  it.each([
    {
      name: "a spawn error",
      result: {
        status: null,
        signal: null,
        stdout: "",
        stderr: "",
        error: new Error("docker is unavailable"),
      },
      expected: "Could not start Docker: docker is unavailable",
    },
    {
      name: "a signal",
      result: {
        status: null,
        signal: "SIGTERM" as const,
        stdout: "",
        stderr: "",
      },
      expected: "Docker stopped after signal SIGTERM",
    },
    {
      name: "a missing status",
      result: { status: null, signal: null, stdout: "", stderr: "" },
      expected: "Docker returned no exit status",
    },
  ])("reports $name with repair guidance", ({ result, expected }) => {
    const messages: string[] = [];

    expect(
      runContainerCheck("agentic-coding-os:ci", {
        spawn: vi.fn().mockReturnValue(result),
        writeError: (message) => messages.push(message),
      }),
    ).toBe(1);
    expect(messages.join("")).toContain(expected);
    expect(messages.join("")).toContain("Repair:");
  });

  it("reports a failed image inspection", () => {
    const messages: string[] = [];

    expect(
      runContainerCheck("missing:ci", {
        spawn: vi.fn().mockReturnValue({
          status: 1,
          signal: null,
          stdout: "",
          stderr: "No such image\n",
        }),
        writeError: (message) => messages.push(message),
      }),
    ).toBe(1);
    expect(messages.join("")).toContain(
      'Docker could not inspect image "missing:ci".',
    );
    expect(messages.join("")).toContain("No such image");
    expect(messages.join("")).toContain("Repair:");
  });

  it("rejects any runtime user other than nextjs", () => {
    const messages: string[] = [];

    expect(
      runContainerCheck("agentic-coding-os:ci", {
        spawn: vi.fn().mockReturnValue({
          status: 0,
          signal: null,
          stdout: "root\n",
          stderr: "",
        }),
        writeError: (message) => messages.push(message),
      }),
    ).toBe(1);
    expect(messages.join("")).toContain(
      'must use runtime user "nextjs", but Docker reported "root"',
    );
    expect(messages.join("")).toContain("Repair:");
  });
});

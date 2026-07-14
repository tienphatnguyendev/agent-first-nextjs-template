import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface ContainerInspectResult {
  readonly status: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly error?: Error;
}

type SpawnInspect = (
  command: string,
  args: readonly string[],
  options: { readonly encoding: "utf8" },
) => ContainerInspectResult;

interface ContainerCheckOptions {
  readonly spawn?: SpawnInspect;
  readonly writeError?: (message: string) => void;
}

const spawnInspect: SpawnInspect = (command, args, options) =>
  spawnSync(command, [...args], options);

const repairInstruction =
  "Repair: build the image with pnpm run container:build, then rerun " +
  "pnpm run container:check.\n";

export function runContainerCheck(
  image: string | undefined,
  options: ContainerCheckOptions = {},
): number {
  const spawn = options.spawn ?? spawnInspect;
  const writeError =
    options.writeError ?? ((message: string) => process.stderr.write(message));

  if (!image?.trim()) {
    writeError("Container image is required.\n");
    writeError("Repair: pass an image name or run pnpm run container:check.\n");
    return 1;
  }

  const result = spawn(
    "docker",
    ["image", "inspect", image, "--format", "{{.Config.User}}"],
    { encoding: "utf8" },
  );

  if (result.error) {
    writeError(`Could not start Docker: ${result.error.message}\n`);
    writeError(repairInstruction);
    return 1;
  }
  if (result.signal) {
    writeError(`Docker stopped after signal ${result.signal}.\n`);
    writeError(repairInstruction);
    return 1;
  }
  if (result.status === null) {
    writeError("Docker returned no exit status.\n");
    writeError(repairInstruction);
    return 1;
  }
  if (result.status !== 0) {
    writeError(`Docker could not inspect image "${image}".\n`);
    if (result.stderr.trim()) writeError(`${result.stderr.trim()}\n`);
    writeError(repairInstruction);
    return 1;
  }

  const runtimeUser = result.stdout.trim();
  if (runtimeUser !== "nextjs") {
    writeError(
      `Image "${image}" must use runtime user "nextjs", but Docker ` +
        `reported "${runtimeUser || "<empty>"}".\n`,
    );
    writeError(repairInstruction);
    return 1;
  }

  return 0;
}

const entrypoint = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entrypoint === fileURLToPath(import.meta.url)) {
  process.exitCode = runContainerCheck(process.argv[2]);
}

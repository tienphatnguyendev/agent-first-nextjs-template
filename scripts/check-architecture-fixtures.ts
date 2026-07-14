import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkClientDirectiveFileNames } from "./check-client-directives";

interface Fixture {
  readonly name: string;
  readonly expectedRule?: string;
}

interface DependencyCruiserProcessResult {
  readonly status: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly error?: Error;
}

type ExecuteDependencyCruiser = (
  sourcePath: string,
) => DependencyCruiserProcessResult;

interface TextOutput {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
}

const fixtures: readonly Fixture[] = [
  { name: "valid-public-import" },
  { name: "valid-layer-imports" },
  {
    name: "app-private-import",
    expectedRule: "no-app-private-module-imports",
  },
  {
    name: "cross-module-private-import",
    expectedRule: "no-private-cross-module-imports",
  },
  {
    name: "domain-framework-import",
    expectedRule: "no-domain-framework-imports",
  },
  {
    name: "shared-platform-import",
    expectedRule: "no-shared-module-or-platform-imports",
  },
  {
    name: "client-server-import",
    expectedRule: "no-client-server-imports",
  },
  {
    name: "client-directive-filename",
    expectedRule: "client-directive-requires-client-filename",
  },
  {
    name: "domain-platform-import",
    expectedRule: "no-domain-outside-layer",
  },
  {
    name: "domain-generated-prisma-import",
    expectedRule: "no-domain-outside-layer",
  },
  {
    name: "application-platform-import",
    expectedRule: "no-application-outside-layers",
  },
  {
    name: "ui-infrastructure-import",
    expectedRule: "no-ui-infrastructure-imports",
  },
];

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const fixtureRoot = path.join(repositoryRoot, "tests/architecture/fixtures");
const dependencyCruiserEntry = fileURLToPath(
  import.meta.resolve("dependency-cruiser"),
);
const dependencyCruiserCli = path.resolve(
  path.dirname(dependencyCruiserEntry),
  "../../bin/dependency-cruise.mjs",
);

const processOutput: TextOutput = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
};

function executeDependencyCruiser(
  sourcePath: string,
): DependencyCruiserProcessResult {
  return spawnSync(
    process.execPath,
    [
      dependencyCruiserCli,
      sourcePath,
      "--config",
      path.join(repositoryRoot, ".dependency-cruiser.cjs"),
      "--output-type",
      "err-long",
    ],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
    },
  );
}

export function runDependencyCruiser(
  fixture: Fixture,
  execute: ExecuteDependencyCruiser = executeDependencyCruiser,
  output: TextOutput = processOutput,
) {
  const sourcePath = path.join(fixtureRoot, fixture.name, "src");
  const result = execute(sourcePath);
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";

  if (stdout) output.stdout(stdout);
  if (stderr) output.stderr(stderr);

  if (result.error) {
    const diagnostic =
      `Could not run dependency-cruiser for ${fixture.name}: ${result.error.message}\n` +
      "Repair: install dependencies with pnpm install and run the command again.\n";
    output.stderr(diagnostic);
    return { exitCode: 1, output: `${stdout}${stderr}${diagnostic}` };
  }

  if (result.signal) {
    const diagnostic =
      `Dependency-cruiser stopped after receiving ${result.signal} for ${fixture.name}.\n` +
      "Repair: remove the process interruption or resource limit and run the command again.\n";
    output.stderr(diagnostic);
    return { exitCode: 1, output: `${stdout}${stderr}${diagnostic}` };
  }

  if (result.status === null) {
    const diagnostic =
      `Dependency-cruiser ended without an exit status for ${fixture.name}.\n` +
      "Repair: rerun pnpm architecture:fixtures and inspect the local environment if it fails again.\n";
    output.stderr(diagnostic);
    return { exitCode: 1, output: `${stdout}${stderr}${diagnostic}` };
  }

  return {
    exitCode: result.status,
    output: `${stdout}${stderr}`,
  };
}

function explainFailure(fixture: Fixture, message: string) {
  const expected = fixture.expectedRule
    ? ` Expected rule: ${fixture.expectedRule}.`
    : "";
  process.stderr.write(
    `Architecture fixture ${fixture.name} failed: ${message}.${expected}\n` +
      "Repair: align the fixture and .dependency-cruiser.cjs with the documented boundary.\n",
  );
}

function runFixtureChecks(fixture: Fixture) {
  const sourcePath = path.join(fixtureRoot, fixture.name, "src");
  const sourceOutput: string[] = [];
  const sourceExitCode = checkClientDirectiveFileNames(
    sourcePath,
    (message) => {
      sourceOutput.push(message);
      process.stderr.write(message);
    },
  );
  const dependencyResult = runDependencyCruiser(fixture);

  return {
    exitCode: sourceExitCode !== 0 ? sourceExitCode : dependencyResult.exitCode,
    output: `${sourceOutput.join("")}${dependencyResult.output}`,
  };
}

function verifyFixture(fixture: Fixture): boolean {
  const result = runFixtureChecks(fixture);

  if (!fixture.expectedRule) {
    if (result.exitCode === 0) return true;
    explainFailure(fixture, "the valid import returned a nonzero exit code");
    return false;
  }

  if (result.exitCode === 0) {
    explainFailure(fixture, "the invalid import returned exit code 0");
    return false;
  }
  if (!result.output.includes(fixture.expectedRule)) {
    explainFailure(fixture, "the output did not name the expected rule");
    return false;
  }
  if (!result.output.includes("Repair:")) {
    explainFailure(fixture, "the output did not include repair guidance");
    return false;
  }

  return true;
}

function main(args: readonly string[]) {
  const fixtureFlag = args.indexOf("--fixture");
  const selectedName = fixtureFlag === -1 ? undefined : args[fixtureFlag + 1];

  if (fixtureFlag !== -1) {
    const fixture = fixtures.find(({ name }) => name === selectedName);
    if (!fixture) {
      process.stderr.write(
        `Unknown architecture fixture: ${selectedName ?? "<missing>"}.\n` +
          "Repair: pass one of the fixture directory names under tests/architecture/fixtures.\n",
      );
      process.exitCode = 1;
    } else {
      process.exitCode = runFixtureChecks(fixture).exitCode;
    }
  } else {
    const failures = fixtures.filter((fixture) => !verifyFixture(fixture));
    if (failures.length > 0) {
      process.exitCode = 1;
    } else {
      process.stdout.write(
        `Architecture fixtures passed: ${fixtures.length} checked.\n`,
      );
    }
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}

import { spawnSync } from "node:child_process";
import path from "node:path";

interface Fixture {
  readonly name: string;
  readonly expectedRule?: string;
}

const fixtures: readonly Fixture[] = [
  { name: "valid-public-import" },
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
];

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const fixtureRoot = path.join(repositoryRoot, "tests/architecture/fixtures");

function runDependencyCruiser(fixture: Fixture) {
  const sourcePath = path.join(fixtureRoot, fixture.name, "src");
  const result = spawnSync(
    "depcruise",
    [
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

  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);

  if (result.error) {
    process.stderr.write(
      `Could not run dependency-cruiser for ${fixture.name}: ${result.error.message}\n` +
        "Repair: install dependencies with pnpm install and run the command again.\n",
    );
  }

  return {
    exitCode: result.status ?? 1,
    output: `${result.stdout}${result.stderr}`,
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

function verifyFixture(fixture: Fixture): boolean {
  const result = runDependencyCruiser(fixture);

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

const fixtureFlag = process.argv.indexOf("--fixture");
const selectedName =
  fixtureFlag === -1 ? undefined : process.argv[fixtureFlag + 1];

if (fixtureFlag !== -1) {
  const fixture = fixtures.find(({ name }) => name === selectedName);
  if (!fixture) {
    process.stderr.write(
      `Unknown architecture fixture: ${selectedName ?? "<missing>"}.\n` +
        "Repair: pass one of the fixture directory names under tests/architecture/fixtures.\n",
    );
    process.exitCode = 1;
  } else {
    process.exitCode = runDependencyCruiser(fixture).exitCode;
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

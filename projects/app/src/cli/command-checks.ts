import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

type CommandCheck = {
  name: string;
  argv: string[];
  expectedExitCode: number;
  stdoutIncludes?: string;
  stdoutExcludes?: string;
  stderrIncludes?: string;
  env?: Record<string, string | undefined>;
};

const appRoot = join(import.meta.dir, "..", "..");

const checks: CommandCheck[] = [
  {
    name: "help",
    argv: ["help"],
    expectedExitCode: 0,
    stdoutIncludes: "situ self-update",
  },
  {
    name: "help omits dev-only commands by default",
    argv: ["help"],
    expectedExitCode: 0,
    stdoutExcludes: "skills sync",
  },
  {
    name: "help omits internal self-update flags by default",
    argv: ["help"],
    expectedExitCode: 0,
    stdoutExcludes: "--tarball",
  },
  {
    name: "help shows dev-only commands with SITU_DEV=1",
    argv: ["help"],
    expectedExitCode: 0,
    stdoutIncludes: "skills sync",
    env: { SITU_DEV: "1" },
  },
  {
    name: "help shows internal self-update flags with SITU_DEV=1",
    argv: ["help"],
    expectedExitCode: 0,
    stdoutIncludes: "--tarball",
    env: { SITU_DEV: "1" },
  },
  {
    name: "self update help",
    argv: ["self", "update", "--help"],
    expectedExitCode: 0,
    stdoutIncludes: "--tarball path",
  },
  {
    name: "skills help",
    argv: ["skills", "--help"],
    expectedExitCode: 0,
    stdoutIncludes: "situ skills sync",
  },
  {
    name: "exec help shows default port",
    argv: ["exec", "--help"],
    expectedExitCode: 0,
    stdoutIncludes: "--port 5500",
  },
  {
    name: "exec rejects positional objective",
    argv: ["exec", "bad positional objective"],
    expectedExitCode: 1,
    stderrIncludes: "objective must be provided with --objective",
  },
  {
    name: "exec requires objective for new session",
    argv: ["exec"],
    expectedExitCode: 1,
    stderrIncludes: "objective is required unless --resume or --session is provided",
  },
  {
    name: "compute requires explicit session",
    argv: ["compute", "list"],
    expectedExitCode: 1,
    stderrIncludes: "situ compute requires --session <session>.",
  },
  {
    name: "compute rejects resume",
    argv: ["compute", "list", "--resume"],
    expectedExitCode: 1,
    stderrIncludes: "situ compute does not support --resume",
  },
  {
    name: "resume requires session id",
    argv: ["resume"],
    expectedExitCode: 1,
    stderrIncludes: "situ resume requires a session id",
  },
  {
    name: "sessions json on empty home",
    argv: ["sessions", "--json"],
    expectedExitCode: 0,
    stdoutIncludes: '"sessions": []',
    env: { SITU_HOME: await mkdtemp(join(tmpdir(), "situ-cli-check-")) },
  },
  {
    name: "resume parses session and reaches key guard",
    argv: ["resume", "ses_check", "--timeout", "1"],
    expectedExitCode: 1,
    stderrIncludes: "SITU_ANTHROPIC_KEY is required for headless exec.",
    env: {
      SITU_HOME: await mkdtemp(join(tmpdir(), "situ-cli-check-")),
      SITU_ANTHROPIC_KEY: "",
    },
  },
];

for (const check of checks) {
  const result = Bun.spawnSync({
    cmd: ["bun", "run", "src/cli.ts", ...check.argv],
    cwd: appRoot,
    env: {
      ...process.env,
      ...check.env,
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode !== check.expectedExitCode) {
    fail({
      check,
      stdout,
      stderr,
      reason: `expected exit ${check.expectedExitCode}, got ${result.exitCode}`,
    });
  }
  if (check.stdoutIncludes && !stdout.includes(check.stdoutIncludes)) {
    fail({
      check,
      stdout,
      stderr,
      reason: `stdout did not include ${JSON.stringify(check.stdoutIncludes)}`,
    });
  }
  if (check.stdoutExcludes && stdout.includes(check.stdoutExcludes)) {
    fail({
      check,
      stdout,
      stderr,
      reason: `stdout unexpectedly included ${JSON.stringify(check.stdoutExcludes)}`,
    });
  }
  if (check.stderrIncludes && !stderr.includes(check.stderrIncludes)) {
    fail({
      check,
      stdout,
      stderr,
      reason: `stderr did not include ${JSON.stringify(check.stderrIncludes)}`,
    });
  }
}

console.log(`CLI command checks passed (${checks.length})`);

function fail({
  check,
  reason,
  stdout,
  stderr,
}: {
  check: CommandCheck;
  reason: string;
  stdout: string;
  stderr: string;
}): never {
  console.error(`CLI command check failed: ${check.name}`);
  console.error(reason);
  console.error("stdout:");
  console.error(stdout);
  console.error("stderr:");
  console.error(stderr);
  process.exit(1);
}

/**
 * Parses `--effort <value>` (or `-e <value>`) out of an argv array, sets
 * `process.env.SITU_EFFORT`, and removes the matched flag + value from the
 * array in place. Designed to be invoked from a bootstrap module that runs
 * BEFORE any other module captures the env (specifically, before
 * `claude/agents/roles/models.ts` evaluates).
 *
 * Returns the value applied (or undefined if no recognized flag was found).
 * Multiple occurrences are tolerated; the last one wins.
 */
export function applyEffortFlag({ argv }: { argv: string[] }): string | undefined {
  let applied: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg !== "--effort" && arg !== "-e") {
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("-")) {
      // Missing value — drop the bare flag so downstream parsers don't choke.
      argv.splice(i, 1);
      i--;
      continue;
    }
    process.env.SITU_EFFORT = next;
    applied = next;
    argv.splice(i, 2);
    i--;
  }
  return applied;
}

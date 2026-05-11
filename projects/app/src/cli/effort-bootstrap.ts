/**
 * Side-effect bootstrap module. Importing this runs `applyEffortFlag` against
 * `Bun.argv`, which sets `process.env.SITU_EFFORT` when a `--effort`/`-e` flag
 * is present and strips the flag + value out of argv so downstream parsers
 * don't see an unknown option.
 *
 * Must be the FIRST import in `cli.ts` — before any module that captures the
 * env at module-load (specifically `claude/agents/roles/models.ts`).
 */
import { applyEffortFlag } from "./effort-flag";

applyEffortFlag({ argv: Bun.argv });

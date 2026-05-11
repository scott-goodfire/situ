---
name: situ-playwright-storybook-screenshots
description: Use when inspecting Situ web UI, Storybook stories, screenshots, visual regressions, or browser behavior for the runtime app or web packages.
---

# Situ Playwright Storybook Screenshots

## Purpose

Use this skill for browser-driven UI review in this repo. Prefer repeatable
Storybook checks for component packages and direct local app checks for the
runtime app in `projects/app/src/web`.

## Storybook Surfaces

The repo has two Storybook packages:

```bash
mise run storybook:ui
mise run storybook:app-ui
```

Use matching type/build checks before finishing UI work:

```bash
mise run check
bun --filter=@situ/web-ui run storybook:build
bun --filter=@situ/web-app-ui run storybook:build
```

If Storybook fails before stories load, first distinguish config errors
from native dependency bootstrap errors. A failure like
`MainFileEvaluationError` plus `The service was stopped: write EPIPE`
while evaluating `.storybook/main.ts` can come from a stale or corrupt
local `esbuild` native binary in `node_modules`, not from the Storybook
config itself.

Check the esbuild instance Storybook resolves:

```bash
node - <<'EOF'
const { createRequire } = require("node:module");
const req = createRequire(require.resolve("storybook/package.json"));
console.log(req.resolve("esbuild/package.json"));
console.log(req("esbuild/package.json").version);
req("esbuild")
  .transform("export default {}", { loader: "ts", format: "esm" })
  .then((result) => console.log(result.code.trim()))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
EOF
```

If that transform exits with `EPIPE`, `SIGKILL`, or
`The service was stopped`, refresh the local install before changing
Storybook config or pinning transitive dependencies:

```bash
bun install --force
```

Then rerun both Storybook builds.

Capture screenshots into `/tmp`, not the repo.

## Runtime App Surface

The installed/runtime app is intentionally minimal and lives under
`projects/app/src/web`. For release-style verification use:

```bash
.agents/skills/situ-verify-local-distribution/scripts/local-release-smoke.sh
```

For source-mode inspection:

```bash
mise run app -- --port 0
```

Open the printed URL and verify:

- `/` loads the Situ page.
- `/app.js`, `/tokens.css`, and `/styles.css` return `200`.
- `/api/bootstrap` returns the active session metadata.
- `/api/status` reflects whether an Anthropic key is configured.

## Visual Review Expectations

- Check light, dark, and system theme behavior when touching styles.
- For `@situ/web-ui`, review primitive states: empty, disabled, focus,
  hover, loading, compact/dense, and overflow.
- For `@situ/web-app-ui`, review domain states for hypotheses, experiments,
  baselines, evaluations, and empty lists.
- Text must fit inside controls at desktop and narrow widths.
- Do not rely only on screenshots. Run `mise run check` before finishing.

---
name: situ-deploy-docs
description: Use when deploying the Situ docs site to Cloudflare Pages, debugging a failed deploy, or wiring custom-domain and project-creation prerequisites.
---

# Situ Deploy Docs

The docs site at <https://situ.science> is a VitePress static build pushed to
Cloudflare Pages by hand from a developer machine. There is no CI for it.

## What's deployed

```text
projects/docs/                       # @situ/docs workspace
  .vitepress/
    config.ts                        # nav, sidebar, hero, head (favicon)
    theme/                           # custom theme: tokens + serif H1/H2
  index.md, getting-started.md, cli.md
  public/
    favicon.svg
    CNAME                            # situ.science — inert under Cloudflare,
                                     # preserved for a future GH Pages path
  package.json                       # docs:dev / docs:build / docs:deploy
```

Build output lands in `projects/docs/.vitepress/dist/`. `wrangler` uploads
that directory as a new Pages deployment.

## One-time setup

Skip if already done on this machine.

```bash
bun x wrangler login
```

Opens the browser. Token cached under `~/.config/.wrangler` — never lands in
the repo.

If the Cloudflare project does not exist yet:

```bash
bun x wrangler pages project create situ-docs --production-branch=main
```

After the first deploy, bind the custom domain once in the dashboard:

**Workers & Pages → situ-docs → Custom domains → Set up a custom domain →
`situ.science`**.

DNS: if the domain is registered on Cloudflare it auto-wires; otherwise add a
`CNAME @ situ-docs.pages.dev` (or the apex A/AAAA records the dashboard
shows) at the registrar.

## Deploy

```bash
mise run docs:deploy
```

This task:

1. Runs `mise run docs:build` — `bun --filter=@situ/docs run docs:build` →
   `vitepress build`.
2. Runs `wrangler pages deploy .vitepress/dist --project-name=situ-docs --branch=main --commit-dirty=true`.

Wrangler prints a per-deploy preview URL like
`https://<hash>.situ-docs.pages.dev` plus the production URL.
`situ.science` updates within a few seconds.

## Verification

- Open the preview URL printed by wrangler — confirms the upload landed.
- Open <https://situ.science> — confirms the custom domain is serving the new
  deploy.
- Spot-check the favicon, hero name (Source Serif 4), and any pages you
  changed.
- If you changed `cli.md`, also run `bun --filter=@situ/app run check:cli-docs`
  before deploying so the CLI docs stay in sync with `rootCommandKinds`.

## Troubleshooting

- **`Project not found` / code 8000007.** The Pages project is missing.
  Run `bun x wrangler pages project create situ-docs --production-branch=main`
  and retry.
- **HTTP 403 from `wrangler login` or deploy.** Cached token is missing the
  Pages scope. Re-run `bun x wrangler login`.
- **522 / connection refused at the custom domain.** DNS has not propagated
  yet, or the custom domain isn't bound. Check the Pages dashboard's "Custom
  domains" tab — it shows the exact records required.
- **The wrong account is active.** `bun x wrangler whoami` to confirm.
  `bun x wrangler logout` then `login` to switch.

## Adding a future CI deploy

There is no `.github/workflows/docs.yml` today because admin permission on
`scott-goodfire/situ` was unavailable when the docs site went up. If/when CI
deploy is added back, the workflow shape lives in
`situ-policy-ci-workflow-shape`: install once via `jdx/mise-action@v2`, then
call `mise run docs:build` and use `cloudflare/wrangler-action@v3` (or the
`pages-action`) to deploy from the artifact directory.

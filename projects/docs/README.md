# situ

VitePress site for situ. Deployed manually to Cloudflare Pages from a developer
machine; CI deploy is intentionally not wired up yet.

## Local development

```bash
mise run docs:dev      # dev server with HMR
mise run docs:build    # static build into .vitepress/dist
mise run docs:preview  # preview the built site
```

Content lives in `index.md` and sibling Markdown files. Theme and nav config
live in `.vitepress/config.ts`.

## Deploy to Cloudflare Pages

One-time setup:

```bash
bun x wrangler login
```

This opens a browser to authenticate with your Cloudflare account. The
auth token is cached locally under `~/.config/.wrangler` — no secret lives
in the repo.

Each deploy:

```bash
mise run docs:deploy
```

The task builds the site and pushes `projects/docs/.vitepress/dist` to the
`situ-docs` Pages project on the `main` deployment branch.

## Custom domain

`public/CNAME` contains `situ.science` for the (currently disabled) GitHub
Pages path. Cloudflare ignores that file — the custom domain for Cloudflare
Pages is configured per-project in the Cloudflare dashboard under
**Pages → situ-docs → Custom domains**.

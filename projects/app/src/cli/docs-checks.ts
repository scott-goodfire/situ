import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { rootCommandKinds } from "./root-command";

/**
 * Command kinds that exist in the CLI but are intentionally omitted from the
 * public docs site (internal operator surface, not user-facing).
 */
const hiddenFromDocs = new Set<(typeof rootCommandKinds)[number]>(["skills"]);

const docsPath = join(import.meta.dir, "..", "..", "..", "docs", "cli.md");
const content = await readFile(docsPath, "utf8");

const headings = content.match(/^### .+$/gm) ?? [];
const visibleKinds = rootCommandKinds.filter((kind) => !hiddenFromDocs.has(kind));
const missing = visibleKinds.filter((kind) => {
  const pattern = new RegExp(`^### \`situ ${kind}(?:\\s|\`)`);
  return !headings.some((heading) => pattern.test(heading));
});

if (missing.length > 0) {
  console.error("CLI docs coverage check failed:");
  for (const kind of missing) {
    console.error(`  missing "### \`situ ${kind}\`" heading in projects/docs/cli.md`);
  }
  process.exit(1);
}

console.log(
  `CLI docs coverage passed (${visibleKinds.length} commands; ${hiddenFromDocs.size} hidden)`,
);

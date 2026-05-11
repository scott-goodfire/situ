import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { toFile } from "@anthropic-ai/sdk";
import type { Uploadable } from "@anthropic-ai/sdk/core/uploads";

import { resolveRuntimeSkillsRoot } from "./runtime-paths";
import type { ClaudeAgentSkillDefinition } from "./types";

export type ClaudeAgentSkillSource = {
  hash: string;
  files: Uploadable[];
};

export async function readSkillSource({
  definition,
}: {
  definition: ClaudeAgentSkillDefinition;
}): Promise<ClaudeAgentSkillSource> {
  const root = resolve(resolveRuntimeSkillsRoot().root, definition.directoryName);
  const filePaths = await listFiles({ root });
  const hash = createHash("sha256");
  const files: Uploadable[] = [];

  for (const filePath of filePaths) {
    const content = await readFile(filePath);
    const relativePath = relative(root, filePath);
    hash.update(relativePath);
    hash.update("\0");
    hash.update(content);
    files.push(await toFile(content, `${definition.directoryName}/${relativePath}`));
  }

  if (!filePaths.some((filePath) => relative(root, filePath) === "SKILL.md")) {
    throw new Error(`Runtime skill is missing SKILL.md: ${definition.name}`);
  }

  return {
    hash: hash.digest("hex"),
    files,
  };
}

async function listFiles({ root }: { root: string }): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(root, entry.name);
      if (entry.isDirectory()) {
        return listFiles({ root: path });
      }
      return [path];
    }),
  );
  return files.flat().sort();
}

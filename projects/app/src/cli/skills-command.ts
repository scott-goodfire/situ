import { getAnthropicClient } from "../claude/agents/anthropic-client";
import {
  syncClaudeAgentRuntimeSkills,
  type ClaudeAgentSkillSyncReport,
} from "../claude/agents/skills";

type SkillsCommand = {
  kind: "sync";
  json: boolean;
};

export async function runSkillsCommand({ argv }: { argv: string[] }): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    printSkillsHelp();
    return 0;
  }

  const command = parseSkillsCommand({ argv });
  const client = await getAnthropicClient();
  const report = await syncClaudeAgentRuntimeSkills({ beta: client.beta });
  if (command.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    writeSyncReport({ report });
  }
  return 0;
}

function parseSkillsCommand({ argv }: { argv: string[] }): SkillsCommand {
  const [subcommand, ...rest] = argv;
  if (subcommand !== "sync") {
    throw new Error("situ skills requires a subcommand: sync");
  }
  let json = false;
  for (const arg of rest) {
    if (arg === "--json") {
      json = true;
      continue;
    }
    throw new Error(`unknown option: ${arg}`);
  }
  return { kind: "sync", json };
}

function writeSyncReport({ report }: { report: ClaudeAgentSkillSyncReport }): void {
  console.log(`Runtime skills: ${report.source.mode}`);
  console.log(`  root:  ${report.source.root}`);
  console.log(`  state: ${report.statePath}`);
  for (const skill of report.skills) {
    console.log(`  ${skill.name}: ${skill.action} ${skill.skillId}@${skill.version}`);
  }
}

function printSkillsHelp(): void {
  console.log(`Usage:
  situ skills sync [--json]

Commands:
  sync    Upload or update runtime Managed Agent skills.`);
}

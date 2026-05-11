import { mkdir, rm, stat, writeFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

import { SKILL_NAME, skillMarkdown } from "./instructions-body";

type SkillSubcommand = "install" | "uninstall" | "show-path";

export async function runSkillCommand({ argv }: { argv: string[] }): Promise<number> {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return argv.length === 0 ? 1 : 0;
  }

  const [subcommand, ...rest] = argv as [SkillSubcommand | string, ...string[]];
  switch (subcommand) {
    case "install":
      return installSkill({ argv: rest });
    case "uninstall":
      return uninstallSkill({ argv: rest });
    case "show-path":
      console.log(skillPath());
      return 0;
    default:
      console.error(`unknown subcommand: ${subcommand}`);
      printHelp();
      return 1;
  }
}

function printHelp(): void {
  console.log(`Usage:
  situ skill install     Install the Situ Claude Code skill (~/.claude/skills/${SKILL_NAME}/SKILL.md)
  situ skill uninstall   Remove the installed skill
  situ skill show-path   Print the skill's install path`);
}

async function installSkill({ argv: _argv }: { argv: string[] }): Promise<number> {
  const target = skillPath();
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, skillMarkdown(), "utf8");
  console.log(`Installed Situ Claude Code skill at ${target}`);
  console.log(`Use it from any Claude Code session by typing: /${SKILL_NAME}`);
  return 0;
}

async function uninstallSkill({ argv: _argv }: { argv: string[] }): Promise<number> {
  const target = skillPath();
  const present = await fileExists(target);
  if (!present) {
    console.log(`No Situ skill installed at ${target}`);
    return 0;
  }
  await rm(target, { force: true });
  const parent = dirname(target);
  if (await directoryIsEmpty(parent)) {
    await rm(parent, { recursive: true, force: true });
  }
  console.log(`Removed Situ Claude Code skill from ${target}`);
  return 0;
}

export function skillPath(): string {
  const override = process.env.SITU_CLAUDE_SKILLS_HOME?.trim();
  const skillsHome = override || join(homedir(), ".claude", "skills");
  return join(skillsHome, SKILL_NAME, "SKILL.md");
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isFile();
  } catch {
    return false;
  }
}

async function directoryIsEmpty(path: string): Promise<boolean> {
  try {
    const entries = await readdir(path);
    return entries.length === 0;
  } catch {
    return false;
  }
}

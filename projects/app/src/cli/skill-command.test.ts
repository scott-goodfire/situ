import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runSkillCommand, skillPath } from "./skill-command";

describe("runSkillCommand", () => {
  const originalEnv = process.env.SITU_CLAUDE_SKILLS_HOME;
  let tempHome: string;

  beforeEach(async () => {
    tempHome = await mkdtemp(join(tmpdir(), "situ-skill-test-"));
    process.env.SITU_CLAUDE_SKILLS_HOME = tempHome;
  });

  afterEach(async () => {
    await rm(tempHome, { recursive: true, force: true });
    if (originalEnv === undefined) {
      delete process.env.SITU_CLAUDE_SKILLS_HOME;
    } else {
      process.env.SITU_CLAUDE_SKILLS_HOME = originalEnv;
    }
  });

  test("install writes a SKILL.md with frontmatter and body", async () => {
    const code = await runSkillCommand({ argv: ["install"] });
    expect(code).toBe(0);

    const target = skillPath();
    const contents = await readFile(target, "utf8");
    expect(contents).toMatch(/^---\nname: situ\ndescription: /);
    expect(contents).toContain("# Situ first-run setup");
    expect(contents).toContain("situ exec");
    expect(contents).toContain("situ events --follow");
  });

  test("install is idempotent (overwrites in place)", async () => {
    await runSkillCommand({ argv: ["install"] });
    const code = await runSkillCommand({ argv: ["install"] });
    expect(code).toBe(0);

    const target = skillPath();
    const info = await stat(target);
    expect(info.isFile()).toBe(true);
  });

  test("uninstall removes a previously installed skill", async () => {
    await runSkillCommand({ argv: ["install"] });
    const code = await runSkillCommand({ argv: ["uninstall"] });
    expect(code).toBe(0);

    const target = skillPath();
    await expect(stat(target)).rejects.toThrow();
  });

  test("uninstall is a no-op when no skill is installed", async () => {
    const code = await runSkillCommand({ argv: ["uninstall"] });
    expect(code).toBe(0);
  });

  test("show-path prints the target path", async () => {
    const lines: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      lines.push(args.join(" "));
    };

    try {
      const code = await runSkillCommand({ argv: ["show-path"] });
      expect(code).toBe(0);
    } finally {
      console.log = originalLog;
    }

    expect(lines.join("\n")).toContain("SKILL.md");
  });

  test("prints help and returns 1 with no subcommand, 0 with --help", async () => {
    const linesEmpty: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      linesEmpty.push(args.join(" "));
    };

    try {
      expect(await runSkillCommand({ argv: [] })).toBe(1);
      expect(linesEmpty.join("\n")).toContain("Usage:");
      linesEmpty.length = 0;
      expect(await runSkillCommand({ argv: ["--help"] })).toBe(0);
      expect(linesEmpty.join("\n")).toContain("Usage:");
    } finally {
      console.log = originalLog;
    }
  });

  test("unknown subcommand returns 1", async () => {
    const lines: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    console.log = (...args: unknown[]) => {
      lines.push(args.join(" "));
    };
    console.error = (...args: unknown[]) => {
      lines.push(args.join(" "));
    };

    try {
      const code = await runSkillCommand({ argv: ["bogus"] });
      expect(code).toBe(1);
      expect(lines.join("\n")).toContain("unknown subcommand: bogus");
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  });
});

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";

import type { ManagedAgentsBeta } from "../resources";
import { claudeAgentBlueprintForRole, type ClaudeAgentRole } from "../roles";
import { claudeAgentSkillDefinitions, syncClaudeAgentRuntimeSkills } from ".";

const originalSituHome = process.env.SITU_HOME;
const originalSkillsDir = process.env.SITU_AGENT_SKILLS_DIR;
const temporaryRoots = new Set<string>();

describe("Claude agent runtime skill registry", () => {
  test("registers every skill that any blueprint references with the right role", () => {
    const byName = new Map(claudeAgentSkillDefinitions.map((d) => [d.name, d]));
    const roles: readonly ClaudeAgentRole[] = [
      "manager",
      "scientist",
      "verifier",
      "scribe",
      "reporter",
    ];
    const missing: { role: ClaudeAgentRole; name: string; reason: string }[] = [];
    for (const role of roles) {
      const blueprint = claudeAgentBlueprintForRole({ role });
      for (const name of blueprint.skillNames) {
        const def = byName.get(name);
        if (!def) {
          missing.push({ role, name, reason: "not registered" });
          continue;
        }
        if (!def.roles.includes(role)) {
          missing.push({ role, name, reason: `roles missing ${role}` });
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("Claude agent runtime skill sync", () => {
  afterEach(async () => {
    restoreEnv();
    await Promise.all(
      [...temporaryRoots].map((root) => rm(root, { recursive: true, force: true })),
    );
    temporaryRoots.clear();
  });

  test("creates remote skills and persists local skill state", async () => {
    const fixture = await createFixture();
    const beta = fakeBeta();

    const report = await syncClaudeAgentRuntimeSkills({ beta: beta.client });

    expect(report.skills.map((skill) => skill.action)).toEqual(
      claudeAgentSkillDefinitions.map(() => "created"),
    );
    expect(beta.created).toHaveLength(claudeAgentSkillDefinitions.length);

    const state = await readSkillState({ home: fixture.home });
    expect(Object.keys(state.skills).sort()).toEqual(
      claudeAgentSkillDefinitions.map((definition) => definition.name).sort(),
    );
    const managerState = state.skills["situ-manager-runtime"];
    expect(managerState).toBeDefined();
    if (!managerState) {
      throw new Error("Missing persisted situ-manager-runtime state.");
    }
    expect(managerState.skillId).toMatch(/^skill_/);
  });

  test("reuses unchanged skills after verifying stored versions", async () => {
    await createFixture();
    const beta = fakeBeta();

    await syncClaudeAgentRuntimeSkills({ beta: beta.client });
    const report = await syncClaudeAgentRuntimeSkills({ beta: beta.client });

    expect(report.skills.map((skill) => skill.action)).toEqual(
      claudeAgentSkillDefinitions.map(() => "reused"),
    );
    expect(beta.created).toHaveLength(claudeAgentSkillDefinitions.length);
    expect(beta.versionCreates).toHaveLength(0);
    expect(beta.versionRetrieves).toHaveLength(claudeAgentSkillDefinitions.length);
  });

  test("creates a replacement skill when local skill content changes", async () => {
    const fixture = await createFixture();
    const beta = fakeBeta();
    await syncClaudeAgentRuntimeSkills({ beta: beta.client });

    await writeSkill({
      root: fixture.skillsRoot,
      directoryName: "situ-manager-runtime",
      body: "Updated manager runtime procedure.",
    });
    const report = await syncClaudeAgentRuntimeSkills({ beta: beta.client });

    const managerResult = report.skills.find((skill) => skill.name === "situ-manager-runtime");
    expect(managerResult).toBeDefined();
    if (!managerResult) {
      throw new Error("Missing situ-manager-runtime result.");
    }
    expect(managerResult.action).toBe("recreated");
    expect(beta.created).toHaveLength(claudeAgentSkillDefinitions.length + 1);
    expect(beta.versionCreates).toHaveLength(0);
  });

  test("recreates a skill when stored remote skill state is gone", async () => {
    await createFixture();
    const beta = fakeBeta();
    await syncClaudeAgentRuntimeSkills({ beta: beta.client });

    const manager = beta.created.find((skill) =>
      skill.displayTitle.startsWith("situ Manager Runtime "),
    );
    expect(manager).toBeDefined();
    if (!manager) {
      throw new Error("Missing initially created situ-manager-runtime skill.");
    }
    beta.missingSkillIds.add(manager.id);

    const report = await syncClaudeAgentRuntimeSkills({ beta: beta.client });
    const managerResult = report.skills.find((skill) => skill.name === "situ-manager-runtime");

    expect(managerResult).toBeDefined();
    if (!managerResult) {
      throw new Error("Missing recreated situ-manager-runtime result.");
    }
    expect(managerResult.action).toBe("recreated");
    expect(managerResult.skillId).not.toBe(manager.id);
    expect(beta.created).toHaveLength(claudeAgentSkillDefinitions.length + 1);
  });

  test("reuses an existing remote skill when isolated state hits a duplicate display title", async () => {
    const fixture = await createFixture();
    const beta = fakeBeta();

    const firstReport = await syncClaudeAgentRuntimeSkills({ beta: beta.client });
    await rm(join(fixture.home, "managed-agent-skills.json"), { force: true });
    const report = await syncClaudeAgentRuntimeSkills({ beta: beta.client });
    const firstScientist = firstReport.skills.find(
      (skill) => skill.name === "situ-scientist-runtime",
    );
    const scientistResult = report.skills.find((skill) => skill.name === "situ-scientist-runtime");

    expect(firstScientist).toBeDefined();
    expect(scientistResult).toBeDefined();
    if (!firstScientist || !scientistResult) {
      throw new Error("Missing situ-scientist-runtime result.");
    }
    expect(scientistResult.action).toBe("reused");
    expect(scientistResult.skillId).toBe(firstScientist.skillId);
    expect(beta.created).toHaveLength(claudeAgentSkillDefinitions.length);
    expect(beta.versionCreates).toHaveLength(0);
  });
});

type FakeBeta = {
  client: ManagedAgentsBeta;
  created: { id: string; displayTitle: string; latestVersion: string }[];
  versionCreates: { skillId: string; version: string }[];
  versionRetrieves: { skillId: string; version: string }[];
  missingSkillIds: Set<string>;
};

function fakeBeta(): FakeBeta {
  const created: FakeBeta["created"] = [];
  const versionCreates: FakeBeta["versionCreates"] = [];
  const versionRetrieves: FakeBeta["versionRetrieves"] = [];
  const missingSkillIds = new Set<string>();
  let nextSkill = 1;
  let nextVersion = 1;

  const client = {
    skills: {
      create: async ({ display_title }: { display_title?: string | null; files?: unknown[] }) => {
        if (
          display_title &&
          created.some(
            (skill) => skill.displayTitle === display_title && !missingSkillIds.has(skill.id),
          )
        ) {
          throw duplicateDisplayTitle({ displayTitle: display_title });
        }
        const id = `skill_${nextSkill}`;
        nextSkill += 1;
        const latestVersion = `version_${nextVersion}`;
        nextVersion += 1;
        created.push({
          id,
          displayTitle: display_title ?? "",
          latestVersion,
        });
        return {
          id,
          created_at: new Date(0).toISOString(),
          display_title,
          latest_version: latestVersion,
          source: "custom",
          type: "skill",
          updated_at: new Date(0).toISOString(),
        };
      },
      list: async function* () {
        for (const skill of created.filter((candidate) => !missingSkillIds.has(candidate.id))) {
          yield {
            id: skill.id,
            created_at: new Date(0).toISOString(),
            display_title: skill.displayTitle,
            latest_version: skill.latestVersion,
            source: "custom",
            type: "skill",
            updated_at: new Date(0).toISOString(),
          };
        }
      },
      versions: {
        create: async (skillId: string) => {
          if (missingSkillIds.has(skillId)) {
            throw notFound();
          }
          const version = `version_${nextVersion}`;
          nextVersion += 1;
          versionCreates.push({ skillId, version });
          return {
            id: `skill_version_${version}`,
            created_at: new Date(0).toISOString(),
            description: "test",
            directory: "test",
            name: "test",
            skill_id: skillId,
            type: "skill_version",
            version,
          };
        },
        retrieve: async (version: string, { skill_id }: { skill_id: string }) => {
          versionRetrieves.push({ skillId: skill_id, version });
          if (missingSkillIds.has(skill_id)) {
            throw notFound();
          }
          return {
            id: `skill_version_${version}`,
            created_at: new Date(0).toISOString(),
            description: "test",
            directory: "test",
            name: "test",
            skill_id,
            type: "skill_version",
            version,
          };
        },
      },
    },
  } as unknown as ManagedAgentsBeta;

  return {
    client,
    created,
    versionCreates,
    versionRetrieves,
    missingSkillIds,
  };
}

async function createFixture(): Promise<{
  home: string;
  skillsRoot: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "situ-skill-sync-"));
  temporaryRoots.add(root);
  const home = join(root, "state");
  const skillsRoot = join(root, "skills");
  await mkdir(home, { recursive: true });
  for (const definition of claudeAgentSkillDefinitions) {
    await writeSkill({
      root: skillsRoot,
      directoryName: definition.directoryName,
      body: `${definition.displayTitle} procedure.`,
    });
  }
  process.env.SITU_HOME = home;
  process.env.SITU_AGENT_SKILLS_DIR = skillsRoot;
  return { home, skillsRoot };
}

async function writeSkill({
  root,
  directoryName,
  body,
}: {
  root: string;
  directoryName: string;
  body: string;
}): Promise<void> {
  const dir = join(root, directoryName);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "SKILL.md"),
    [
      "---",
      `name: ${directoryName}`,
      `description: Runtime guidance for ${directoryName}.`,
      "---",
      "",
      `# ${directoryName}`,
      "",
      body,
      "",
    ].join("\n"),
  );
}

async function readSkillState({ home }: { home: string }): Promise<{
  skills: Record<string, { skillId: string; version: string; sourceHash: string }>;
}> {
  return JSON.parse(await readFile(join(home, "managed-agent-skills.json"), "utf8"));
}

function notFound(): Error & { status: number } {
  return Object.assign(new Error("not found"), { status: 404 });
}

function duplicateDisplayTitle({ displayTitle }: { displayTitle: string }): Error & {
  status: number;
} {
  return Object.assign(new Error(`Skill cannot reuse an existing display_title: ${displayTitle}`), {
    status: 400,
  });
}

function restoreEnv(): void {
  if (originalSituHome === undefined) {
    delete process.env.SITU_HOME;
  } else {
    process.env.SITU_HOME = originalSituHome;
  }
  if (originalSkillsDir === undefined) {
    delete process.env.SITU_AGENT_SKILLS_DIR;
  } else {
    process.env.SITU_AGENT_SKILLS_DIR = originalSkillsDir;
  }
}

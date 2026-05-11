import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { claudeAgentSkillDefinitions } from "../claude/agents/skills";
import { buildDoctorReport, buildDoctorSpaAssetsReport } from "./doctor";

const originalEnv = {
  SITU_AGENT_SKILLS_DIR: process.env.SITU_AGENT_SKILLS_DIR,
  SITU_ANTHROPIC_KEY: process.env.SITU_ANTHROPIC_KEY,
  SITU_BUILD_DATE: process.env.SITU_BUILD_DATE,
  SITU_BUILD_GIT_SHA: process.env.SITU_BUILD_GIT_SHA,
  SITU_BUILD_VERSION: process.env.SITU_BUILD_VERSION,
  SITU_HOME: process.env.SITU_HOME,
  SITU_SECRETS_PATH: process.env.SITU_SECRETS_PATH,
  SITU_SPA_DIST: process.env.SITU_SPA_DIST,
};

let tempRoot: string;

describe("doctor report", () => {
  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "situ-doctor-"));
    process.env.SITU_HOME = join(tempRoot, "state");
    process.env.SITU_SPA_DIST = join(tempRoot, "spa");
    process.env.SITU_AGENT_SKILLS_DIR = join(tempRoot, "skills");
    process.env.SITU_SECRETS_PATH = join(tempRoot, "secrets.json");
    process.env.SITU_ANTHROPIC_KEY = "sk-ant-test-doctor";
    process.env.SITU_BUILD_VERSION = "1.2.3-test";
    process.env.SITU_BUILD_GIT_SHA = "abcdef123456";
    process.env.SITU_BUILD_DATE = "2026-01-01T00:00:00.000Z";

    const spaDist = join(tempRoot, "spa");
    await mkdir(spaDist, { recursive: true });
    await writeFile(join(spaDist, "index.html"), '<div id="root"></div>\n');
    await mkdir(join(spaDist, "assets"), { recursive: true });

    for (const definition of claudeAgentSkillDefinitions) {
      const directory = join(process.env.SITU_AGENT_SKILLS_DIR, definition.directoryName);
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, "SKILL.md"), `---\nname: ${definition.name}\n---\n`);
    }
  });

  afterEach(async () => {
    restoreEnv();
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("reports a healthy local installation when required assets are present", async () => {
    const report = await buildDoctorReport();

    expect(report.isHealthy).toBe(true);
    expect(report.version).toBe("1.2.3-test");
    expect(report.gitSha).toBe("abcdef123456");
    expect(report.buildDate).toBe("2026-01-01T00:00:00.000Z");
    expect(report.spaAssets).toMatchObject({
      mode: "configured",
      isPresent: true,
      missing: [],
      sourceRoot: null,
      isSourcePresent: false,
      sourceMissing: [],
      isServedByVite: false,
    });
    expect(report.runtimeSkills.isPresent).toBe(true);
    expect(report.runtimeSkills.missing).toEqual([]);
    expect(report.agentBlueprints.isHealthy).toBe(true);
    const roles = report.agentBlueprints.perRole.map((entry) => entry.role).sort();
    expect(roles).toEqual(["manager", "reporter", "scientist", "scribe", "verifier"]);
    for (const entry of report.agentBlueprints.perRole) {
      expect(entry.skillIssues).toEqual([]);
      expect(entry.toolCount).toBeGreaterThan(0);
    }
    expect(report.stateHome.writable).toBe(true);
    expect(report.secrets.anthropicKeyConfigured).toBe(true);
  });

  test("reports an unhealthy configured installation when SPA assets are missing", async () => {
    const spaDist = process.env.SITU_SPA_DIST;
    if (!spaDist) {
      throw new Error("SITU_SPA_DIST must be set by the doctor test setup");
    }
    await rm(spaDist, { recursive: true, force: true });

    const report = await buildDoctorReport();

    expect(report.isHealthy).toBe(false);
    expect(report.spaAssets).toMatchObject({
      mode: "configured",
      isPresent: false,
      missing: ["index.html", "assets/"],
      sourceRoot: null,
      isSourcePresent: false,
      sourceMissing: [],
      isServedByVite: false,
    });
  });

  test("reports source mode as Vite-ready without built SPA assets", async () => {
    const sourceRoot = join(tempRoot, "web-source");
    await writeSourceSpaApp({ root: sourceRoot });

    const spaAssets = buildDoctorSpaAssetsReport({
      spaAssets: {
        mode: "source",
        root: join(tempRoot, "missing-spa-dist"),
      },
      sourceRoot,
    });

    expect(spaAssets).toMatchObject({
      mode: "source",
      isPresent: false,
      missing: ["index.html", "assets/"],
      sourceRoot,
      isSourcePresent: true,
      sourceMissing: [],
      isServedByVite: true,
    });
  });

  test("reports this source checkout healthy when the web app can be served by Vite", async () => {
    delete process.env.SITU_SPA_DIST;

    const report = await buildDoctorReport();

    expect(report.isHealthy).toBe(true);
    expect(report.spaAssets.mode).toBe("source");
    expect(report.spaAssets.isSourcePresent).toBe(true);
    expect(report.spaAssets.sourceMissing).toEqual([]);
    expect(report.spaAssets.isServedByVite).toBe(true);
  });
});

async function writeSourceSpaApp({ root }: { root: string }): Promise<void> {
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "index.html"), '<div id="root"></div>\n');
  await writeFile(join(root, "package.json"), "{}\n");
  await writeFile(join(root, "src/main.tsx"), "\n");
  await writeFile(join(root, "vite.config.ts"), "\n");
}

function restoreEnv(): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

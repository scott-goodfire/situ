import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { localStateHome } from "./config/paths";
import { installInfo } from "./config/install-info";
import { hasAnthropicKey } from "./secrets/local-secret-store";
import {
  claudeAgentSkillDefinitionByName,
  runtimeSkillDiagnostics,
  type RuntimeSkillDiagnostics,
} from "./claude/agents/skills";
import { claudeAgentBlueprintForRole, type ClaudeAgentRole } from "./claude/agents/roles";
import { claudeAgentToolParamsForRole } from "./claude/agents/tools";
import {
  missingSourceSpaAppFiles,
  missingSpaAssets,
  resolveSpaAssets,
  sourceSpaRootPath,
  type SpaAssets,
} from "./spa";

export type AgentBlueprintDiagnostics = {
  isHealthy: boolean;
  perRole: {
    role: ClaudeAgentRole;
    skillIssues: string[];
    toolCount: number;
  }[];
};

export type DoctorReport = {
  isHealthy: boolean;
  version: string;
  gitSha: string | null;
  buildDate: string | null;
  spaAssets: {
    mode: SpaAssets["mode"];
    root: string;
    isPresent: boolean;
    missing: string[];
    sourceRoot: string | null;
    isSourcePresent: boolean;
    sourceMissing: string[];
    isServedByVite: boolean;
  };
  runtimeSkills: RuntimeSkillDiagnostics;
  agentBlueprints: AgentBlueprintDiagnostics;
  stateHome: {
    path: string;
    writable: boolean;
  };
  secrets: {
    anthropicKeyConfigured: boolean;
  };
};

const ALL_AGENT_ROLES: readonly ClaudeAgentRole[] = [
  "manager",
  "scientist",
  "verifier",
  "scribe",
  "reporter",
];

export function validateAgentBlueprints(): AgentBlueprintDiagnostics {
  const perRole = ALL_AGENT_ROLES.map((role) => {
    const blueprint = claudeAgentBlueprintForRole({ role });
    const skillIssues: string[] = [];
    for (const skillName of blueprint.skillNames) {
      try {
        const definition = claudeAgentSkillDefinitionByName({ name: skillName });
        if (!definition.roles.includes(role)) {
          skillIssues.push(`${skillName} not tagged for ${role}`);
        }
      } catch (error) {
        skillIssues.push(error instanceof Error ? error.message : String(error));
      }
    }
    const tools = claudeAgentToolParamsForRole({ role });
    return { role, skillIssues, toolCount: tools.length };
  });
  const isHealthy = perRole.every((entry) => entry.skillIssues.length === 0 && entry.toolCount > 0);
  return { isHealthy, perRole };
}

export async function runDoctorCommand({ argv }: { argv: string[] }): Promise<number> {
  const json = argv.includes("--json");
  const report = await buildDoctorReport();
  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    writeDoctorReport({ report });
  }
  return report.isHealthy ? 0 : 1;
}

export async function buildDoctorReport(): Promise<DoctorReport> {
  const info = installInfo();
  const spaAssets = resolveSpaAssets();
  const doctorSpaAssets = buildDoctorSpaAssetsReport({ spaAssets });
  const runtimeSkills = runtimeSkillDiagnostics();
  const agentBlueprints = validateAgentBlueprints();
  const stateHome = localStateHome();
  const [stateWritable, anthropicKeyConfigured] = await Promise.all([
    isStateHomeWritable({ path: stateHome }),
    hasAnthropicKey(),
  ]);

  return {
    isHealthy:
      stateWritable &&
      isDoctorSpaReady({ spaAssets: doctorSpaAssets }) &&
      runtimeSkills.isPresent &&
      agentBlueprints.isHealthy,
    version: info.version,
    gitSha: info.gitSha,
    buildDate: info.buildDate,
    spaAssets: doctorSpaAssets,
    runtimeSkills,
    agentBlueprints,
    stateHome: {
      path: stateHome,
      writable: stateWritable,
    },
    secrets: {
      anthropicKeyConfigured,
    },
  };
}

export function buildDoctorSpaAssetsReport({
  spaAssets,
  sourceRoot = sourceSpaRootPath(),
}: {
  spaAssets: SpaAssets;
  sourceRoot?: string;
}): DoctorReport["spaAssets"] {
  const missing = missingSpaAssets({ root: spaAssets.root });
  const isSourceMode = spaAssets.mode === "source";
  const sourceMissing = isSourceMode ? missingSourceSpaAppFiles({ root: sourceRoot }) : [];
  const isSourcePresent = isSourceMode && sourceMissing.length === 0;

  return {
    mode: spaAssets.mode,
    root: spaAssets.root,
    isPresent: missing.length === 0,
    missing,
    sourceRoot: isSourceMode ? sourceRoot : null,
    isSourcePresent,
    sourceMissing,
    isServedByVite: isSourcePresent,
  };
}

function writeDoctorReport({ report }: { report: DoctorReport }): void {
  console.log(`situ:          ${report.version}`);
  writeDoctorBuildInfo({ report });
  writeDoctorSpaAssets({ spaAssets: report.spaAssets });
  writeDoctorRuntimeSkills({ runtimeSkills: report.runtimeSkills });
  writeDoctorAgentBlueprints({ agentBlueprints: report.agentBlueprints });
  console.log(`state home:    ${report.stateHome.path}`);
  console.log(`  writable:    ${report.stateHome.writable}`);
  console.log(`anthropic key: ${report.secrets.anthropicKeyConfigured ? "configured" : "missing"}`);
  console.log(`healthy:       ${report.isHealthy}`);
}

function writeDoctorBuildInfo({ report }: { report: DoctorReport }): void {
  if (report.gitSha) {
    console.log(`git sha:       ${report.gitSha.slice(0, 8)}`);
  }
  if (report.buildDate) {
    console.log(`build date:    ${report.buildDate}`);
  }
}

function writeDoctorSpaAssets({ spaAssets }: { spaAssets: DoctorReport["spaAssets"] }): void {
  const isSpaReady = isDoctorSpaReady({ spaAssets });
  console.log(`spa assets:    ${isSpaReady ? "ok" : "missing"}`);
  console.log(`  mode:        ${spaAssets.mode}`);
  console.log(`  root:        ${spaAssets.root}`);
  console.log(`  built:       ${spaAssets.isPresent ? "present" : "missing"}`);
  if (spaAssets.missing.length > 0) {
    console.log(`  missing:     ${spaAssets.missing.join(", ")}`);
  }
  if (spaAssets.sourceRoot) {
    writeDoctorSourceSpaAssets({ spaAssets });
  }
}

function writeDoctorSourceSpaAssets({ spaAssets }: { spaAssets: DoctorReport["spaAssets"] }): void {
  console.log(`  source:      ${spaAssets.isSourcePresent ? "ok" : "missing"}`);
  console.log(`  source root: ${spaAssets.sourceRoot}`);
  console.log(`  served by:   ${spaAssets.isServedByVite ? "vite" : "none"}`);
  if (spaAssets.sourceMissing.length > 0) {
    console.log(`  source missing: ${spaAssets.sourceMissing.join(", ")}`);
  }
}

function writeDoctorRuntimeSkills({
  runtimeSkills,
}: {
  runtimeSkills: RuntimeSkillDiagnostics;
}): void {
  console.log(`runtime skills:${runtimeSkills.isPresent ? " ok" : " missing"}`);
  console.log(`  mode:        ${runtimeSkills.source.mode}`);
  console.log(`  root:        ${runtimeSkills.source.root}`);
  console.log(`  state:       ${runtimeSkills.statePath}`);
  if (runtimeSkills.missing.length > 0) {
    console.log(`  missing:     ${runtimeSkills.missing.join(", ")}`);
  }
}

function writeDoctorAgentBlueprints({
  agentBlueprints,
}: {
  agentBlueprints: AgentBlueprintDiagnostics;
}): void {
  console.log(`agent blueprints:${agentBlueprints.isHealthy ? " ok" : " unhealthy"}`);
  for (const entry of agentBlueprints.perRole) {
    console.log(`  ${entry.role.padEnd(11)} ${entry.toolCount} tools`);
    for (const issue of entry.skillIssues) {
      console.log(`    issue:     ${issue}`);
    }
  }
}

function isDoctorSpaReady({ spaAssets }: { spaAssets: DoctorReport["spaAssets"] }): boolean {
  if (spaAssets.mode === "source") {
    return spaAssets.isServedByVite;
  }
  return spaAssets.isPresent;
}

async function isStateHomeWritable({ path }: { path: string }): Promise<boolean> {
  try {
    await mkdir(path, { recursive: true });
    await access(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

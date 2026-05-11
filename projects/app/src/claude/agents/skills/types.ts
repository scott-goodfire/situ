import type { ClaudeAgentRole } from "../roles";
import type { RuntimeSkillSource } from "./runtime-paths";

export type ClaudeAgentSkillDefinition = {
  readonly name: string;
  readonly displayTitle: string;
  readonly directoryName: string;
  readonly roles: readonly ClaudeAgentRole[];
};

export type ClaudeAgentSkillSyncAction = "created" | "recreated" | "reused";

export type ClaudeAgentSkillSyncResult = {
  name: string;
  displayTitle: string;
  directoryName: string;
  roles: readonly string[];
  skillId: string;
  version: string;
  sourceHash: string;
  action: ClaudeAgentSkillSyncAction;
};

export type ClaudeAgentSkillSyncReport = {
  source: RuntimeSkillSource;
  statePath: string;
  skills: ClaudeAgentSkillSyncResult[];
};

export type RuntimeSkillDiagnostics = {
  source: RuntimeSkillSource;
  statePath: string;
  isPresent: boolean;
  missing: string[];
  skills: {
    name: string;
    directoryName: string;
    path: string;
    isPresent: boolean;
    roles: readonly string[];
  }[];
};

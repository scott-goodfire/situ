import type { ClaudeAgentEnvironmentRecord, ClaudeAgentRecord, SessionRecord } from "./records";

export type RuntimeStatusRecord = {
  agent: ClaudeAgentRecord | null;
  environment: ClaudeAgentEnvironmentRecord | null;
  session: SessionRecord | null;
};

export type StatusRecord = RuntimeStatusRecord;

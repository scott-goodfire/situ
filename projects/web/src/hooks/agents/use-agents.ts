import type { ClaudeAgentRecord } from "@situ/protocol";
import { useEntityList } from "../entity";

export function useAgents(): ClaudeAgentRecord[] {
  return useEntityList<ClaudeAgentRecord>("claudeAgents/");
}

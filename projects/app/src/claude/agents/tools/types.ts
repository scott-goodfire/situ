import type { AgentToolDefinition, AgentToolHandler, AgentToolResult } from "@situ/agent-tools";

import type { ClaudeAgentRole } from "../roles";
import type { WorkItem } from "../../../runtime/work-items";

export type ClaudeAgentToolContext = {
  readonly agentId?: string;
  readonly claudeAgentRunId: string;
  readonly workItem: WorkItem;
  readonly activeResearchTaskId?: string;
};

export type ClaudeAgentToolResult = AgentToolResult;

export type ClaudeAgentToolHandler = AgentToolHandler<ClaudeAgentToolContext>;

export type ClaudeAgentToolDefinition = AgentToolDefinition<
  ClaudeAgentRole,
  ClaudeAgentToolContext
>;

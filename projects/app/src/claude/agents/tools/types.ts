import type { BetaManagedAgentsCustomToolParams } from "@anthropic-ai/sdk/resources/beta/agents";

import type { ClaudeAgentRole } from "../roles";
import type { WorkItem } from "../../../runtime/work-items";

export type ClaudeAgentToolDefinition = BetaManagedAgentsCustomToolParams & {
  readonly roles: readonly ClaudeAgentRole[];
  readonly handler: ClaudeAgentToolHandler;
};

export type ClaudeAgentToolResult = {
  readonly content: string;
  readonly isError?: boolean;
};

export type ClaudeAgentToolHandler = (input: {
  readonly input: unknown;
  readonly context: ClaudeAgentToolContext;
}) => Promise<ClaudeAgentToolResult>;

export type ClaudeAgentToolContext = {
  readonly agentId?: string;
  readonly claudeAgentRunId: string;
  readonly workItem: WorkItem;
  readonly activeResearchTaskId?: string;
};

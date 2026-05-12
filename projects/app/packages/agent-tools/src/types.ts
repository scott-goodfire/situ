import type { BetaManagedAgentsCustomToolParams } from "@anthropic-ai/sdk/resources/beta/agents";

export type AgentToolResult = {
  readonly content: string;
  readonly isError?: boolean;
};

export type AgentToolHandler<Context> = (input: {
  readonly input: unknown;
  readonly context: Context;
}) => Promise<AgentToolResult>;

export type AgentToolDefinition<
  Role extends string,
  Context,
> = BetaManagedAgentsCustomToolParams & {
  readonly roles: readonly Role[];
  readonly handler: AgentToolHandler<Context>;
};

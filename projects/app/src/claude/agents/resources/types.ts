import type Anthropic from "@anthropic-ai/sdk";

export type ManagedAgentsBeta = Anthropic["beta"];

export type ManagedSessionRecord = {
  id: string;
  agentId: string;
  claudeSessionId: string;
  claudeAgentId: string;
  claudeEnvironmentId: string;
};

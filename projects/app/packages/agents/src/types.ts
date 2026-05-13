import type { IsoTimestamp } from "@situ/common";

export const AGENT_STATUSES = ["active", "paused", "disabled"] as const;

export type AgentStatus = (typeof AGENT_STATUSES)[number];

export type AgentRecord = {
  id: string;
  name: string;
  role: string;
  instructionsMarkdown: string;
  status: AgentStatus;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
};

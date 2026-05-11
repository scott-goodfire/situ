import type { ClaudeAgentRecord } from "../domain/records";
import { daysAgo, hoursAgo, minutesAgo } from "./helpers";

export const AGENT_FIXTURES: ClaudeAgentRecord[] = [
  {
    id: "agt_manager_01",
    kind: "manager",
    displayName: "Manager",
    claudeAgentId: "ag_a1b2c3",
    claudeAgentVersion: 4,
    claudeSessionId: "cs_xyz",
    model: "claude-opus-4-7",
    status: "active",
    createdAt: daysAgo(2),
    updatedAt: minutesAgo(2),
  },
  {
    id: "agt_scientist_01",
    kind: "scientist",
    displayName: "Scientist",
    claudeAgentId: "ag_d4e5f6",
    claudeAgentVersion: 2,
    claudeSessionId: "cs_xyz",
    model: "claude-sonnet-4-6",
    status: "idle",
    createdAt: daysAgo(2),
    updatedAt: hoursAgo(1),
  },
  {
    id: "agt_verifier_01",
    kind: "verifier",
    displayName: "Verifier",
    claudeAgentId: null,
    claudeAgentVersion: null,
    claudeSessionId: null,
    model: "claude-haiku-4-5-20251001",
    status: "closed",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
  },
];

import type { ResearchProjectStatus, ResearchStatus } from "../../status";

const terminalResearchStatuses = new Set<ResearchStatus>(["done", "canceled", "failed"]);
const terminalResearchProjectStatuses = new Set<ResearchProjectStatus>([
  "complete",
  "failed",
  "canceled",
]);

function isTerminalResearchStatus({ status }: { status: ResearchStatus }): boolean {
  return terminalResearchStatuses.has(status);
}

function isTerminalResearchProjectStatus({ status }: { status: ResearchProjectStatus }): boolean {
  return terminalResearchProjectStatuses.has(status);
}

export const statusModule = {
  isTerminalResearchStatus,
  isTerminalResearchProjectStatus,
} as const;

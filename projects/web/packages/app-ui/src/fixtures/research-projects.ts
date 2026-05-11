import type { ResearchProjectRecord } from "../domain/records";
import { daysAgo, minutesAgo } from "./helpers";

export const RESEARCH_PROJECT_FIXTURES: ResearchProjectRecord[] = [
  {
    id: "rpj_verified_search_01",
    title: "Verified Search Flow",
    goal: "Cut over situ's product surface from flat work queues to a verified research task tree.",
    status: "researching",
    baselineSummary:
      "The current UI has ResearchProject setup and diagnostic entity pages, with the workspace centered on ResearchTask frontier state.",
    currentDecision:
      "Promote the verified task frontier, keep task and work-item pages as diagnostics, and read ResearchProject records from the protocol surface.",
    reportSummary:
      "The workspace now tracks one active Research Project, an inspected task frontier, verifier outcomes, evidence, and report state.",
    createdAt: daysAgo(2),
    updatedAt: minutesAgo(8),
  },
  {
    id: "rpj_baseline_gate_02",
    title: "Baseline Gate",
    goal: "Confirm the manager baseline before autonomous research begins.",
    status: "blocked",
    baselineSummary:
      "Manager has inspected durable state and is waiting on user confirmation before opening the verified task workspace.",
    currentDecision: "Ask for baseline confirmation.",
    reportSummary: null,
    createdAt: daysAgo(1),
    updatedAt: minutesAgo(22),
  },
];

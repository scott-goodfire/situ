import type { ResearchProjectInteractionRecord } from "../domain/records";
import { hoursAgo, minutesAgo } from "./helpers";

export const RESEARCH_PROJECT_INTERACTION_FIXTURES: ResearchProjectInteractionRecord[] = [
  {
    id: "rpi_baseline_01",
    projectId: "rpj_baseline_gate_02",
    kind: "baseline_confirmation",
    prompt: "Confirm the manager baseline before autonomous research begins.",
    details:
      "Baseline: the project has a single active research goal, a proposed starting plan, and no verified task tree yet.",
    status: "pending",
    response: null,
    createdAt: minutesAgo(24),
    updatedAt: minutesAgo(24),
  },
  {
    id: "rpi_decision_02",
    projectId: "rpj_verified_search_01",
    kind: "decision",
    prompt: "Promote the verified task workspace as the primary post-onboarding surface.",
    details:
      "The diagnostics remain available, but the manager's operating view is now the ResearchTask frontier.",
    status: "confirmed",
    response: "Proceed with the Research Project workspace.",
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(1),
  },
];

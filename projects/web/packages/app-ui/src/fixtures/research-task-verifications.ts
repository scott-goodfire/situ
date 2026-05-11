import type { ResearchTaskVerificationRecord } from "../domain/records";
import { hoursAgo, minutesAgo } from "./helpers";

export const RESEARCH_TASK_VERIFICATION_FIXTURES: ResearchTaskVerificationRecord[] = [
  {
    id: "rtv_explore_01",
    researchTaskId: "rtk_explore_01",
    status: "pass",
    verifier: "Verifier",
    summary: "The UI cutover is frontend-scoped and centered on the task-tree workspace.",
    evidence: [
      "projects/web/src routes inspected",
      "projects/web/packages/app-ui fixtures inspected",
      "verified-search-flow doc read",
    ],
    createdAt: hoursAgo(20),
    updatedAt: hoursAgo(20),
  },
  {
    id: "rtv_prune_04",
    researchTaskId: "rtk_prune_04",
    status: "pass",
    verifier: "Verifier",
    summary: "Retired protocol and app-ui exports are gone from active web surfaces.",
    evidence: [
      "ResearchProject records exported",
      "Owned web paths use ResearchProject and ResearchTask surfaces",
    ],
    createdAt: hoursAgo(4),
    updatedAt: hoursAgo(4),
  },
  {
    id: "rtv_exploit_02",
    researchTaskId: "rtk_exploit_02",
    status: "pending",
    verifier: "Verifier",
    summary: "Waiting for the workspace view and route checks to finish.",
    evidence: [],
    createdAt: minutesAgo(10),
    updatedAt: minutesAgo(10),
  },
];

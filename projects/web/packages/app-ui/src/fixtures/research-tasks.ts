import type { ResearchTaskRecord } from "../domain/records";
import { daysAgo, hoursAgo, minutesAgo } from "./helpers";

export const RESEARCH_TASK_FIXTURES: ResearchTaskRecord[] = [
  {
    id: "rtk_explore_01",
    projectId: "rpj_verified_search_01",
    parentResearchTaskId: null,
    type: "explore",
    title: "Map UI cutover before changing routes",
    summary: "Find routes, sidebar entries, fixtures, and stories that still feel stale.",
    workerPrompt:
      "Inspect the web and app-ui packages and list the smallest UI changes that make ResearchProject and ResearchTask the primary model.",
    verificationPrompt:
      "Verify the list is scoped to frontend-owned files and does not require protocol or backend edits.",
    status: "verified",
    priority: "high",
    hypothesisId: "hyp_04HZQK5J7C8X3Q9V",
    evidenceCount: 4,
    createdAt: daysAgo(2),
    updatedAt: hoursAgo(18),
  },
  {
    id: "rtk_exploit_02",
    projectId: "rpj_verified_search_01",
    parentResearchTaskId: "rtk_explore_01",
    type: "exploit",
    title: "Build workspace view around research state",
    summary: "Show project status, task frontier, hypotheses, evidence, and reports.",
    workerPrompt: "Build the app-ui workspace view using local adapters and fixtures.",
    verificationPrompt:
      "Confirm the view renders a task tree, verifier states, evidence counts, and report summary without importing app runtime code.",
    status: "running",
    priority: "urgent",
    hypothesisId: null,
    evidenceCount: 3,
    createdAt: hoursAgo(17),
    updatedAt: minutesAgo(12),
  },
  {
    id: "rtk_verify_03",
    projectId: "rpj_verified_search_01",
    parentResearchTaskId: "rtk_exploit_02",
    type: "verify",
    title: "Check sidebar routes after onboarding opens",
    summary: "Confirm Workspace and Hypotheses are primary after onboarding.",
    workerPrompt: "Review the app shell and route declarations after the workspace route is added.",
    verificationPrompt:
      "Verify diagnostic entity routes remain reachable directly, not primary navigation.",
    status: "planned",
    priority: "high",
    hypothesisId: null,
    evidenceCount: 0,
    createdAt: hoursAgo(1),
    updatedAt: hoursAgo(1),
  },
  {
    id: "rtk_prune_04",
    projectId: "rpj_verified_search_01",
    parentResearchTaskId: "rtk_explore_01",
    type: "prune",
    title: "Remove stale setup routes and exports",
    summary: "Drop retired routes, hooks, exports, fixtures, and records.",
    workerPrompt: "Keep web exports centered on ResearchProject and ResearchTask.",
    verificationPrompt:
      "Verify owned web paths only reference ResearchProject, ResearchTask, and Verifier concepts.",
    status: "verified",
    priority: "normal",
    hypothesisId: null,
    evidenceCount: 2,
    createdAt: hoursAgo(6),
    updatedAt: hoursAgo(4),
  },
];

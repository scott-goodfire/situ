import type { BaselineRecord } from "../domain/records";
import { daysAgo, hoursAgo } from "./helpers";

export const BASELINE_FIXTURES: BaselineRecord[] = [
  {
    id: "bsl_01HZQK5J7C8X3Q9V",
    researchProjectId: "rp_fixture_01",
    createdByResearchTaskId: "tsk_baseline_01",
    createdByAgentId: null,
    title: "Stock manager agent on the standard 200-trace eval set",
    summary: "Run-as-shipped baseline on the eval set, no flag changes.",
    status: "done",
    payload: {},
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
  },
  {
    id: "bsl_02HZQK5J7C8X3Q9V",
    researchProjectId: "rp_fixture_01",
    createdByResearchTaskId: null,
    createdByAgentId: null,
    title: "Sandboxed bash on the same 200-trace set",
    summary: "Same baseline with read-only sandbox enforcement on bash.",
    status: "active",
    payload: {},
    createdAt: daysAgo(1),
    updatedAt: hoursAgo(2),
  },
  {
    id: "bsl_03HZQK5J7C8X3Q9V",
    researchProjectId: "rp_fixture_02",
    createdByResearchTaskId: "tsk_baseline_03",
    createdByAgentId: null,
    title: "Concurrent worktree pool baseline",
    summary: "Pre-change baseline before introducing parallel worktrees.",
    status: "triage",
    payload: {},
    createdAt: hoursAgo(5),
    updatedAt: hoursAgo(5),
  },
];

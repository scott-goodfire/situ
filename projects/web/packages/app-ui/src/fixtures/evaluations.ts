import type { EvaluationRecord } from "../domain/records";
import { daysAgo, hoursAgo } from "./helpers";

export const EVALUATION_FIXTURES: EvaluationRecord[] = [
  {
    id: "evl_01HZQK5J7C8X3Q9V",
    createdByResearchTaskId: "tsk_evaluate_01",
    createdByAgentId: null,
    associatedBaselineId: "bsl_01HZQK5J7C8X3Q9V",
    associatedExperimentId: "exp_01HZQK5J7C8X3Q9V",
    title: "Cache-TTL bump vs. baseline on 200-trace set",
    summary: "Comparison of P50/P95 latency, cache hit rate, success rate.",
    status: "done",
    createdAt: hoursAgo(8),
    updatedAt: hoursAgo(6),
  },
  {
    id: "evl_02HZQK5J7C8X3Q9V",
    createdByResearchTaskId: null,
    createdByAgentId: null,
    associatedBaselineId: "bsl_02HZQK5J7C8X3Q9V",
    associatedExperimentId: "exp_03HZQK5J7C8X3Q9V",
    title: "Sandbox-disabled vs. sandboxed baseline",
    summary: "Tool-call overhead measurement.",
    status: "in_review",
    createdAt: daysAgo(1),
    updatedAt: hoursAgo(3),
  },
  {
    id: "evl_03HZQK5J7C8X3Q9V",
    createdByResearchTaskId: null,
    createdByAgentId: null,
    associatedBaselineId: null,
    associatedExperimentId: "exp_04HZQK5J7C8X3Q9V",
    title: "Concurrent worktree throughput",
    summary: "Pending — waiting on baseline to complete.",
    status: "triage",
    createdAt: hoursAgo(4),
    updatedAt: hoursAgo(4),
  },
];

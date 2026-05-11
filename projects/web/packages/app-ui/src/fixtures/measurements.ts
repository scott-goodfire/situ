import type { MeasurementRecord } from "../domain/records";
import { hoursAgo } from "./helpers";

export const MEASUREMENT_FIXTURES: MeasurementRecord[] = [
  {
    id: "msr_01",
    createdByResearchTaskId: "tsk_evaluate_03",
    createdByAgentId: null,
    evaluationId: "evl_01HZQK5J7C8X3Q9V",
    actor: "scientist",
    body: "P50 latency 422ms",
    payload: {},
    createdAt: hoursAgo(7),
  },
  {
    id: "msr_02",
    createdByResearchTaskId: "tsk_evaluate_03",
    createdByAgentId: null,
    evaluationId: "evl_01HZQK5J7C8X3Q9V",
    actor: "scientist",
    body: "P95 latency 1.05s",
    payload: {},
    createdAt: hoursAgo(7),
  },
  {
    id: "msr_03",
    createdByResearchTaskId: null,
    createdByAgentId: null,
    evaluationId: "evl_02HZQK5J7C8X3Q9V",
    actor: "verifier",
    body: "Cache hit rate 0.84",
    payload: {},
    createdAt: hoursAgo(5),
  },
];

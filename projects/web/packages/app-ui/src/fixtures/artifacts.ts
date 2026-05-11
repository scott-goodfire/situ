import type { ArtifactRecord } from "../domain/records";
import { hoursAgo } from "./helpers";

export const ARTIFACT_FIXTURES: ArtifactRecord[] = [
  {
    id: "art_01",
    createdByResearchTaskId: "tsk_experiment_02",
    createdByAgentId: null,
    entityKind: "experiment",
    entityId: "exp_01HZQK5J7C8X3Q9V",
    kind: "log",
    title: "experiment-run.log",
    body: "",
    path: "~/.situ/projects/proj_a/runs/exp-01/run.log",
    mediaType: "text/plain",
    sizeBytes: 18_472,
    createdAt: hoursAgo(7),
  },
  {
    id: "art_02",
    createdByResearchTaskId: "tsk_experiment_02",
    createdByAgentId: null,
    entityKind: "evaluation",
    entityId: "evl_01HZQK5J7C8X3Q9V",
    kind: "csv",
    title: "latency-traces.csv",
    body: "",
    path: "~/.situ/projects/proj_a/evals/evl-01/latency.csv",
    mediaType: "text/csv",
    sizeBytes: 2_348_120,
    createdAt: hoursAgo(6),
  },
];

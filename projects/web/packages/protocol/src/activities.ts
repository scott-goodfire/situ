import type { ProtocolPayload } from "./records";
import type { Timestamp } from "./timestamp";

type ActivityRecordBase = {
  id: number;
  actorAgentId: string | null;
  actor: string;
  kind: string;
  body: string;
  payload: ProtocolPayload;
  createdAt: Timestamp;
};

export type HypothesisActivityRecord = ActivityRecordBase & {
  hypothesisId: string;
};

export type ExperimentActivityRecord = ActivityRecordBase & {
  experimentId: string;
};

export type BaselineActivityRecord = ActivityRecordBase & {
  baselineId: string;
};

export type EvaluationActivityRecord = ActivityRecordBase & {
  evaluationId: string;
};

export type ActivityRecord =
  | HypothesisActivityRecord
  | ExperimentActivityRecord
  | BaselineActivityRecord
  | EvaluationActivityRecord;

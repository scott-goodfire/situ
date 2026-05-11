import type {
  BaselineActivityRecord,
  EvaluationActivityRecord,
  ExperimentActivityRecord,
  HypothesisActivityRecord,
} from "@situ/protocol";
import { activityRecordBase } from "./activity-record-base";
import type {
  BaselineActivityRow,
  EvaluationActivityRow,
  ExperimentActivityRow,
  HypothesisActivityRow,
} from "./types";

export function hypothesisActivityRecord({
  row,
}: {
  row: HypothesisActivityRow;
}): HypothesisActivityRecord {
  return {
    ...activityRecordBase({ row, collection: "hypothesisActivities" }),
    hypothesisId: row.hypothesisId,
  };
}

export function experimentActivityRecord({
  row,
}: {
  row: ExperimentActivityRow;
}): ExperimentActivityRecord {
  return {
    ...activityRecordBase({ row, collection: "experimentActivities" }),
    experimentId: row.experimentId,
  };
}

export function baselineActivityRecord({
  row,
}: {
  row: BaselineActivityRow;
}): BaselineActivityRecord {
  return {
    ...activityRecordBase({ row, collection: "baselineActivities" }),
    baselineId: row.baselineId,
  };
}

export function evaluationActivityRecord({
  row,
}: {
  row: EvaluationActivityRow;
}): EvaluationActivityRecord {
  return {
    ...activityRecordBase({ row, collection: "evaluationActivities" }),
    evaluationId: row.evaluationId,
  };
}

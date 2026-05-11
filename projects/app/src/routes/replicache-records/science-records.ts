import type {
  ArtifactRecord,
  BaselineRecord,
  EntityLinkRecord,
  EvaluationRecord,
  ExperimentRecord,
  HypothesisRecord,
  MeasurementRecord,
} from "@situ/protocol";
import { payloadRecord } from "./payload-record";
import type {
  ArtifactRow,
  BaselineRow,
  EntityLinkRow,
  EvaluationRow,
  ExperimentRow,
  HypothesisRow,
  MeasurementRow,
} from "./types";

export function hypothesisRecord({ row }: { row: HypothesisRow }): HypothesisRecord {
  return {
    id: row.id,
    createdByResearchTaskId: row.createdByResearchTaskId,
    createdByAgentId: row.createdByAgentId,
    title: row.title,
    summary: row.summary,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function experimentRecord({ row }: { row: ExperimentRow }): ExperimentRecord {
  return {
    id: row.id,
    createdByResearchTaskId: row.createdByResearchTaskId,
    createdByAgentId: row.createdByAgentId,
    associatedHypothesisId: row.associatedHypothesisId,
    parentExperimentId: row.parentExperimentId,
    title: row.title,
    summary: row.summary,
    status: row.status,
    worktreePath: row.worktreePath,
    baseCommit: row.baseCommit,
    candidateCommit: row.candidateCommit,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function baselineRecord({ row }: { row: BaselineRow }): BaselineRecord {
  return {
    id: row.id,
    researchProjectId: row.researchProjectId,
    createdByResearchTaskId: row.createdByResearchTaskId,
    createdByAgentId: row.createdByAgentId,
    title: row.title,
    summary: row.summary,
    status: row.status,
    payload: payloadRecord({ payloadJson: row.payloadJson, label: `baselines/${row.id}` }),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function evaluationRecord({ row }: { row: EvaluationRow }): EvaluationRecord {
  return {
    id: row.id,
    createdByResearchTaskId: row.createdByResearchTaskId,
    createdByAgentId: row.createdByAgentId,
    associatedBaselineId: row.associatedBaselineId,
    associatedExperimentId: row.associatedExperimentId,
    title: row.title,
    summary: row.summary,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function measurementRecord({ row }: { row: MeasurementRow }): MeasurementRecord {
  return {
    id: row.id,
    createdByResearchTaskId: row.createdByResearchTaskId,
    createdByAgentId: row.createdByAgentId,
    evaluationId: row.evaluationId,
    actor: row.actor,
    body: row.body,
    payload: payloadRecord({ payloadJson: row.payloadJson, label: `measurements/${row.id}` }),
    createdAt: row.createdAt,
  };
}

export function artifactRecord({ row }: { row: ArtifactRow }): ArtifactRecord {
  return {
    id: row.id,
    createdByResearchTaskId: row.createdByResearchTaskId,
    createdByAgentId: row.createdByAgentId,
    entityKind: row.entityKind,
    entityId: row.entityId,
    kind: row.kind,
    title: row.title,
    body: row.body,
    path: row.path,
    mediaType: row.mediaType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
  };
}

export function entityLinkRecord({ row }: { row: EntityLinkRow }): EntityLinkRecord {
  return {
    id: row.id,
    fromKind: row.fromKind,
    fromId: row.fromId,
    toKind: row.toKind,
    toId: row.toId,
    relationship: row.relationship,
    createdAt: row.createdAt,
  };
}

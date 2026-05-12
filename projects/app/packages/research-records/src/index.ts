// Single barrel. Everything consumers need lives here.

export {
  hypotheses,
  experiments,
  baselines,
  evaluations,
  measurements,
  artifacts,
  entityLinks,
  hypothesisActivities,
  experimentActivities,
  baselineActivities,
  evaluationActivities,
  RESEARCH_RECORDS_TABLES_SQL,
} from "./schema";

export { researchRecordsModule } from "./module";

export { hypothesisRepository } from "./repositories/hypotheses";
export { experimentRepository } from "./repositories/experiments";
export { baselineRepository } from "./repositories/baselines";
export { evaluationRepository } from "./repositories/evaluations";
export { measurementRepository } from "./repositories/measurements";
export { artifactRepository } from "./repositories/artifacts";
export { entityLinkRepository } from "./repositories/entity-links";

export { configureResearchRecords, resetResearchRecordsContextForTests } from "./context";

export type {
  ResearchRecordStatus,
  HypothesisRecord,
  HypothesisActivityRecord,
  ExperimentRecord,
  ExperimentActivityRecord,
  BaselineRecord,
  BaselineActivityRecord,
  EvaluationRecord,
  EvaluationActivityRecord,
  MeasurementRecord,
  ArtifactRecord,
  EntityLinkRecord,
  ResearchRecordsContext,
  ResearchRecordsDb,
  ResearchRecordsRunSyncedWrite,
} from "./types";

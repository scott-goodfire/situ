import { configureResearchRecords, resetResearchRecordsContextForTests } from "./context";
import {
  artifactRepository,
  baselineRepository,
  entityLinkRepository,
  evaluationRepository,
  experimentRepository,
  hypothesisRepository,
  measurementRepository,
} from "./repositories";

/**
 * Single namespace object for research-records repositories. Exposes all
 * seven repositories under one object — `researchRecordsModule.hypotheses`,
 * `.experiments`, `.baselines`, `.evaluations`, `.measurements`,
 * `.artifacts`, `.entityLinks`. The barrel also exports each repository
 * individually for direct import.
 */
export const researchRecordsModule = {
  configure: configureResearchRecords,
  resetForTests: resetResearchRecordsContextForTests,
  hypotheses: hypothesisRepository,
  experiments: experimentRepository,
  baselines: baselineRepository,
  evaluations: evaluationRepository,
  measurements: measurementRepository,
  artifacts: artifactRepository,
  entityLinks: entityLinkRepository,
} as const;

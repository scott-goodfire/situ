// Single barrel. Everything consumers need lives here.

export {
  researchProjects,
  researchProjectInteractions,
  researchTasks,
  researchTaskVerifications,
  RESEARCH_PROJECTS_TABLES_SQL,
} from "./schema";

export { researchProjectsModule } from "./module";

export {
  researchProjectRepository,
  researchProjectExecutionMode,
  researchProjectIsHeadless,
  type ResearchProjectExecutionMode,
} from "./repositories/research-projects";
export {
  researchTaskRepository,
  type ResearchTaskRecord,
  type ResearchTaskStatus,
  type ResearchTaskType,
  type ResearchTaskPriority,
} from "./repositories/research-tasks";
export {
  researchTaskVerificationRepository,
  type ResearchTaskVerificationRecord,
  type ResearchTaskVerificationProfile,
  type ResearchTaskVerificationStatus,
} from "./repositories/research-task-verifications";
export { researchProjectInteractionRepository } from "./repositories/research-project-interactions";

export { configureResearchProjects, resetResearchProjectsContextForTests } from "./context";

export type {
  ResearchProjectRecord,
  ResearchProjectPhase,
  ResearchProjectStatus,
  ResearchProjectInteractionRecord,
  ResearchProjectInteractionKind,
  ResearchProjectInteractionStatus,
  ResearchProjectsContext,
  ResearchProjectsDb,
  ResearchProjectsRunSyncedWrite,
} from "./types";

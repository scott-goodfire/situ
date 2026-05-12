import { configureResearchProjects, resetResearchProjectsContextForTests } from "./context";
import { researchProjectRepository } from "./repositories/research-projects";
import { researchProjectInteractionRepository } from "./repositories/research-project-interactions";
import { researchTaskRepository } from "./repositories/research-tasks";
import { researchTaskVerificationRepository } from "./repositories/research-task-verifications";

/**
 * Single namespace object for the research-projects orchestration cluster.
 * Exposes all four repositories under one object —
 * `researchProjectsModule.projects`, `.tasks`, `.verifications`,
 * `.interactions`. The barrel also exports each repository individually.
 */
export const researchProjectsModule = {
  configure: configureResearchProjects,
  resetForTests: resetResearchProjectsContextForTests,
  projects: researchProjectRepository,
  tasks: researchTaskRepository,
  verifications: researchTaskVerificationRepository,
  interactions: researchProjectInteractionRepository,
} as const;

import { createAgentSessionRepository } from "@situ/agent-sessions";
import { createAgentRepository } from "@situ/agents";
import { createArtifactRepository } from "@situ/artifacts";
import { createCommentRepository } from "@situ/comments";
import { createEventRepository } from "@situ/events";
import { createExperimentRepository } from "@situ/experiments";
import { createMeasurementRepository } from "@situ/measurements";
import { createNotificationRepository } from "@situ/notifications";
import { createProjectRepository } from "@situ/projects";
import { createReviewRepository } from "@situ/reviews";
import { createTaskRepository } from "@situ/tasks";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

export type CreateAppRepositoriesInput = {
  db: BunSQLiteDatabase<Record<string, unknown>>;
};

/**
 * Creates app repositories.
 */
export const createAppRepositories = ({ db }: CreateAppRepositoriesInput) => ({
  agentSessions: createAgentSessionRepository({ db }),
  agents: createAgentRepository({ db }),
  artifacts: createArtifactRepository({ db }),
  comments: createCommentRepository({ db }),
  events: createEventRepository({ db }),
  experiments: createExperimentRepository({ db }),
  measurements: createMeasurementRepository({ db }),
  notifications: createNotificationRepository({ db }),
  projects: createProjectRepository({ db }),
  reviews: createReviewRepository({ db }),
  tasks: createTaskRepository({ db }),
});

export type AppRepositories = ReturnType<typeof createAppRepositories>;

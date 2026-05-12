import { desc, eq } from "drizzle-orm";

import { getDb } from "../../db/client";
import { researchProjects } from "../../db/schema";
import { runSyncedWrite } from "../../db/sync";
import { dateTimeModule } from "../../../modules/date-time";
import { jsonModule } from "../../../modules/json";
import { textModule } from "../../../modules/text";
import { clampRepositoryLimit, matchesRepositorySearch, PreconditionError } from "../__shared__";

type ResearchProjectRecord = typeof researchProjects.$inferSelect;
type ResearchProjectPhase = ResearchProjectRecord["phase"];
type ResearchProjectStatus = ResearchProjectRecord["status"];
export type ResearchProjectExecutionMode = "interactive" | "headless";

const projectPhases = new Set<ResearchProjectPhase>([
  "onboarding",
  "baseline",
  "search",
  "reporting",
  "complete",
]);
const projectStatuses = new Set<ResearchProjectStatus>([
  "active",
  "blocked_on_user",
  "complete",
  "failed",
  "canceled",
]);
const terminalProjectStatuses = new Set<ResearchProjectStatus>(["complete", "failed", "canceled"]);

export const researchProjectRepository = {
  async create({
    goal,
    payload = {},
    createdByAgentId,
  }: {
    goal: string;
    payload?: Record<string, unknown>;
    createdByAgentId?: string;
  }): Promise<ResearchProjectRecord> {
    const now = dateTimeModule.nowIso();
    const researchProjectId = crypto.randomUUID();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.insert(researchProjects)
          .values({
            id: researchProjectId,
            goal: textModule.requiredText({ value: goal, label: "goal" }),
            phase: "onboarding",
            status: "active",
            createdByAgentId,
            startedAt: now,
            payloadJson: JSON.stringify(payload),
            syncVersion,
            syncDeleted: false,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      },
    });
    return researchProjectRepository.require({ researchProjectId });
  },

  async get({
    researchProjectId,
  }: {
    researchProjectId: string;
  }): Promise<ResearchProjectRecord | undefined> {
    return getDb().query.researchProjects.findFirst({
      where: eq(researchProjects.id, researchProjectId),
    });
  },

  async require({
    researchProjectId,
  }: {
    researchProjectId: string;
  }): Promise<ResearchProjectRecord> {
    const project = await researchProjectRepository.get({ researchProjectId });
    if (!project) {
      throw new PreconditionError({
        code: "research_project_not_found",
        hint: "List or search ResearchProjects; this id may be abbreviated or stale.",
        details: { researchProjectId },
      });
    }
    return project;
  },

  async list({ limit = 20 }: { limit?: number } = {}): Promise<ResearchProjectRecord[]> {
    const rows = await getDb()
      .select()
      .from(researchProjects)
      .orderBy(desc(researchProjects.createdAt), desc(researchProjects.id));
    return rows.slice(0, clampRepositoryLimit({ limit }));
  },

  async findActive(): Promise<ResearchProjectRecord | undefined> {
    const rows = await researchProjectRepository.list({ limit: 50 });
    return rows.find((project) => !terminalProjectStatuses.has(project.status));
  },

  async findMostRecent(): Promise<ResearchProjectRecord | undefined> {
    const [row] = await researchProjectRepository.list({ limit: 1 });
    return row;
  },

  async search({
    query,
    status,
    phase,
    limit = 20,
  }: {
    query?: string;
    status?: ResearchProjectStatus;
    phase?: ResearchProjectPhase;
    limit?: number;
  } = {}): Promise<ResearchProjectRecord[]> {
    if (status) {
      assertProjectStatus({ status });
    }
    if (phase) {
      assertProjectPhase({ phase });
    }
    const rows = await researchProjectRepository.list({ limit: 200 });
    const filtered = rows.filter((project) => {
      if (status && project.status !== status) {
        return false;
      }
      if (phase && project.phase !== phase) {
        return false;
      }
      return matchesRepositorySearch({
        query,
        values: [
          project.id,
          project.goal,
          project.phase,
          project.status,
          project.baselineSummary,
          project.resultSummary,
        ],
      });
    });
    return filtered.slice(0, clampRepositoryLimit({ limit }));
  },

  async updatePhase({
    researchProjectId,
    phase,
    baselineSummary,
  }: {
    researchProjectId: string;
    phase: ResearchProjectPhase;
    baselineSummary?: string;
  }): Promise<ResearchProjectRecord> {
    assertProjectPhase({ phase });
    const current = await researchProjectRepository.require({ researchProjectId });
    assertProjectNotTerminal({ project: current, operation: "update phase" });
    const now = dateTimeModule.nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.update(researchProjects)
          .set({
            phase,
            baselineSummary: baselineSummary ?? current.baselineSummary,
            syncVersion,
            updatedAt: now,
          })
          .where(eq(researchProjects.id, researchProjectId))
          .run();
      },
    });
    return researchProjectRepository.require({ researchProjectId });
  },

  async transition({
    researchProjectId,
    status,
    resultSummary,
  }: {
    researchProjectId: string;
    status: ResearchProjectStatus;
    resultSummary?: string;
  }): Promise<ResearchProjectRecord> {
    assertProjectStatus({ status });
    const current = await researchProjectRepository.require({ researchProjectId });
    assertProjectNotTerminal({ project: current, operation: "transition" });
    const now = dateTimeModule.nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.update(researchProjects)
          .set({
            status,
            phase: status === "complete" ? "complete" : current.phase,
            resultSummary: resultSummary ?? current.resultSummary,
            completedAt: terminalProjectStatuses.has(status) ? now : current.completedAt,
            syncVersion,
            updatedAt: now,
          })
          .where(eq(researchProjects.id, researchProjectId))
          .run();
      },
    });
    return researchProjectRepository.require({ researchProjectId });
  },
};

export function researchProjectExecutionMode({
  project,
}: {
  project: ResearchProjectRecord;
}): ResearchProjectExecutionMode {
  const payload = jsonModule.parseRecord({ raw: project.payloadJson });
  if (payload.executionMode === "headless" || payload.headless === true) {
    return "headless";
  }
  return "interactive";
}

export function researchProjectIsHeadless({
  project,
}: {
  project: ResearchProjectRecord;
}): boolean {
  return researchProjectExecutionMode({ project }) === "headless";
}

function assertProjectNotTerminal({
  project,
  operation,
}: {
  project: ResearchProjectRecord;
  operation: string;
}): void {
  if (terminalProjectStatuses.has(project.status)) {
    throw new PreconditionError({
      code: "research_project_terminal",
      hint: `ResearchProject is in terminal status "${project.status}" and cannot ${operation}; create a new project instead.`,
      details: { researchProjectId: project.id, currentStatus: project.status, operation },
    });
  }
}

function assertProjectPhase(input: { phase: string }): asserts input is {
  phase: ResearchProjectPhase;
} {
  if (!projectPhases.has(input.phase as ResearchProjectPhase)) {
    throw new PreconditionError({
      code: "research_project_invalid_phase",
      hint: "Use one of: onboarding, baseline, search, reporting, complete.",
      details: { phase: input.phase, allowed: Array.from(projectPhases) },
    });
  }
}

function assertProjectStatus(input: { status: string }): asserts input is {
  status: ResearchProjectStatus;
} {
  if (!projectStatuses.has(input.status as ResearchProjectStatus)) {
    throw new PreconditionError({
      code: "research_project_invalid_status",
      hint: "Use one of: active, blocked_on_user, complete, failed, canceled.",
      details: { status: input.status, allowed: Array.from(projectStatuses) },
    });
  }
}

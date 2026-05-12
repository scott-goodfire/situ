import type { Repository } from "@situ/common";
import { asc, desc, eq } from "drizzle-orm";

import { getResearchProjectsContext } from "../../context";
import { researchProjectInteractions, researchProjects } from "../../schema";
import {
  clampRepositoryLimit,
  matchesRepositorySearch,
  nowIso,
  PreconditionError,
  requiredText,
} from "../../__shared__";
import type {
  ResearchProjectInteractionKind,
  ResearchProjectInteractionRecord,
  ResearchProjectInteractionStatus,
} from "../../types";
import { researchProjectRepository } from "../research-projects";

const interactionKinds = new Set<ResearchProjectInteractionKind>([
  "question",
  "baseline_confirmation",
]);
const interactionStatuses = new Set<ResearchProjectInteractionStatus>([
  "pending",
  "answered",
  "confirmed",
  "rejected",
  "canceled",
]);
const resolvedStatuses = new Set<ResearchProjectInteractionStatus>([
  "answered",
  "confirmed",
  "rejected",
  "canceled",
]);

export const researchProjectInteractionRepository = {
  async create({
    researchProjectId,
    kind,
    prompt,
    details = "",
    payload = {},
    createdByAgentId,
  }: {
    researchProjectId: string;
    kind: ResearchProjectInteractionKind;
    prompt: string;
    details?: string;
    payload?: Record<string, unknown>;
    createdByAgentId?: string;
  }): Promise<ResearchProjectInteractionRecord> {
    assertInteractionKind({ kind });
    const project = await researchProjectRepository.require({ researchProjectId });
    if (["complete", "failed", "canceled"].includes(project.status)) {
      throw new PreconditionError({
        code: "research_project_terminal",
        hint: "ResearchProject is in a terminal status; create or use a non-terminal project before opening an interaction.",
        details: { researchProjectId, currentStatus: project.status },
      });
    }

    const { runSyncedWrite } = getResearchProjectsContext();
    const now = nowIso();
    const interactionId = crypto.randomUUID();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.insert(researchProjectInteractions)
          .values({
            id: interactionId,
            researchProjectId,
            kind,
            prompt: requiredText({ value: prompt, label: "prompt" }),
            details,
            status: "pending",
            createdByAgentId,
            payloadJson: JSON.stringify(payload),
            syncVersion,
            syncDeleted: false,
            createdAt: now,
            updatedAt: now,
          })
          .run();
        db.update(researchProjects)
          .set({
            status: "blocked_on_user",
            syncVersion,
            updatedAt: now,
          })
          .where(eq(researchProjects.id, researchProjectId))
          .run();
      },
    });
    return researchProjectInteractionRepository.require({ interactionId });
  },

  async get({
    interactionId,
  }: {
    interactionId: string;
  }): Promise<ResearchProjectInteractionRecord | undefined> {
    const db = getResearchProjectsContext().getDb();
    const [row] = await db
      .select()
      .from(researchProjectInteractions)
      .where(eq(researchProjectInteractions.id, interactionId))
      .limit(1);
    return row;
  },

  async require({
    interactionId,
  }: {
    interactionId: string;
  }): Promise<ResearchProjectInteractionRecord> {
    const interaction = await researchProjectInteractionRepository.get({ interactionId });
    if (!interaction) {
      throw new PreconditionError({
        code: "research_project_interaction_not_found",
        hint: "List or search ResearchProject interactions; this id may be abbreviated or stale.",
        details: { interactionId },
      });
    }
    return interaction;
  },

  async list({
    limit = 20,
  }: {
    limit?: number;
  } = {}): Promise<ResearchProjectInteractionRecord[]> {
    const db = getResearchProjectsContext().getDb();
    const rows = await db
      .select()
      .from(researchProjectInteractions)
      .orderBy(desc(researchProjectInteractions.createdAt), desc(researchProjectInteractions.id));
    return rows.slice(0, clampRepositoryLimit({ limit }));
  },

  async listByResearchProject({
    researchProjectId,
    limit = 20,
  }: {
    researchProjectId: string;
    limit?: number;
  }): Promise<ResearchProjectInteractionRecord[]> {
    const db = getResearchProjectsContext().getDb();
    const rows = await db
      .select()
      .from(researchProjectInteractions)
      .where(eq(researchProjectInteractions.researchProjectId, researchProjectId))
      .orderBy(asc(researchProjectInteractions.createdAt), asc(researchProjectInteractions.id));
    return rows.slice(0, clampRepositoryLimit({ limit }));
  },

  async search({
    query,
    status,
    limit = 20,
  }: {
    query?: string;
    status?: ResearchProjectInteractionStatus;
    limit?: number;
  } = {}): Promise<ResearchProjectInteractionRecord[]> {
    if (status) {
      assertInteractionStatus({ status });
    }
    const rows = await researchProjectInteractionRepository.list({ limit: 200 });
    const filtered = rows.filter((interaction) => {
      if (status && interaction.status !== status) {
        return false;
      }
      return matchesRepositorySearch({
        query,
        values: [
          interaction.id,
          interaction.researchProjectId,
          interaction.kind,
          interaction.status,
          interaction.prompt,
          interaction.details,
          interaction.response,
        ],
      });
    });
    return filtered.slice(0, clampRepositoryLimit({ limit }));
  },

  async transition({
    interactionId,
    status,
    response,
  }: {
    interactionId: string;
    status: ResearchProjectInteractionStatus;
    response?: string;
  }): Promise<ResearchProjectInteractionRecord> {
    assertInteractionStatus({ status });
    const current = await researchProjectInteractionRepository.require({ interactionId });
    if (current.status !== "pending") {
      throw new PreconditionError({
        code: "research_project_interaction_not_pending",
        hint: "Only pending interactions can transition; this one is already resolved or canceled.",
        details: { interactionId, currentStatus: current.status },
      });
    }
    assertValidResolvedStatus({ kind: current.kind, status });

    const { runSyncedWrite } = getResearchProjectsContext();
    const now = nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.update(researchProjectInteractions)
          .set({
            status,
            response: response?.trim() || current.response,
            resolvedAt: resolvedStatuses.has(status) ? now : current.resolvedAt,
            syncVersion,
            updatedAt: now,
          })
          .where(eq(researchProjectInteractions.id, interactionId))
          .run();
        db.update(researchProjects)
          .set({
            status: "active",
            syncVersion,
            updatedAt: now,
          })
          .where(eq(researchProjects.id, current.researchProjectId))
          .run();
      },
    });
    return researchProjectInteractionRepository.require({ interactionId });
  },
} satisfies Repository<ResearchProjectInteractionRecord, "interactionId">;

function assertInteractionKind(input: { kind: string }): asserts input is {
  kind: ResearchProjectInteractionKind;
} {
  if (!interactionKinds.has(input.kind as ResearchProjectInteractionKind)) {
    throw new PreconditionError({
      code: "research_project_interaction_invalid_kind",
      hint: "Use one of: question, baseline_confirmation.",
      details: { kind: input.kind, allowed: Array.from(interactionKinds) },
    });
  }
}

function assertInteractionStatus(input: { status: string }): asserts input is {
  status: ResearchProjectInteractionStatus;
} {
  if (!interactionStatuses.has(input.status as ResearchProjectInteractionStatus)) {
    throw new PreconditionError({
      code: "research_project_interaction_invalid_status",
      hint: "Use one of: pending, answered, confirmed, rejected, canceled.",
      details: { status: input.status, allowed: Array.from(interactionStatuses) },
    });
  }
}

function assertValidResolvedStatus({
  kind,
  status,
}: {
  kind: ResearchProjectInteractionKind;
  status: ResearchProjectInteractionStatus;
}): void {
  if (kind === "question" && status !== "answered" && status !== "canceled") {
    throw new PreconditionError({
      code: "research_project_interaction_question_invalid_status",
      hint: "Question interactions can only transition to answered or canceled.",
      details: { kind, status, allowed: ["answered", "canceled"] },
    });
  }
  if (kind === "baseline_confirmation" && !["confirmed", "rejected", "canceled"].includes(status)) {
    throw new PreconditionError({
      code: "research_project_interaction_baseline_invalid_status",
      hint: "Baseline confirmation interactions can only transition to confirmed, rejected, or canceled.",
      details: { kind, status, allowed: ["confirmed", "rejected", "canceled"] },
    });
  }
}

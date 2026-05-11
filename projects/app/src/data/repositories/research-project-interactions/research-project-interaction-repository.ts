import { asc, desc, eq } from "drizzle-orm";

import { getDb } from "../../db/client";
import { researchProjectInteractions, researchProjects } from "../../db/schema";
import { runSyncedWrite } from "../../db/sync";
import { dateTimeModule } from "../../../modules/date-time";
import { textModule } from "../../../modules/text";
import { clampRepositoryLimit, matchesRepositorySearch } from "../__shared__";
import { researchProjectRepository } from "../research-projects";

type ResearchProjectInteractionRecord = typeof researchProjectInteractions.$inferSelect;
type ResearchProjectInteractionKind = ResearchProjectInteractionRecord["kind"];
type ResearchProjectInteractionStatus = ResearchProjectInteractionRecord["status"];

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
      throw new Error(
        `Cannot create interaction for terminal ResearchProject: ${researchProjectId}`,
      );
    }

    const now = dateTimeModule.nowIso();
    const interactionId = crypto.randomUUID();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.insert(researchProjectInteractions)
          .values({
            id: interactionId,
            researchProjectId,
            kind,
            prompt: textModule.requiredText({ value: prompt, label: "prompt" }),
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
    return getDb().query.researchProjectInteractions.findFirst({
      where: eq(researchProjectInteractions.id, interactionId),
    });
  },

  async require({
    interactionId,
  }: {
    interactionId: string;
  }): Promise<ResearchProjectInteractionRecord> {
    const interaction = await researchProjectInteractionRepository.get({ interactionId });
    if (!interaction) {
      throw new Error(`ResearchProject interaction not found: ${interactionId}`);
    }
    return interaction;
  },

  async list({ limit = 20 }: { limit?: number } = {}): Promise<ResearchProjectInteractionRecord[]> {
    const rows = await getDb()
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
    const rows = await getDb()
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
      throw new Error(
        `ResearchProject interaction cannot transition from status: ${current.status} (interactionId: ${interactionId})`,
      );
    }
    assertValidResolvedStatus({ kind: current.kind, status });

    const now = dateTimeModule.nowIso();
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
};

function assertInteractionKind(input: { kind: string }): asserts input is {
  kind: ResearchProjectInteractionKind;
} {
  if (!interactionKinds.has(input.kind as ResearchProjectInteractionKind)) {
    throw new Error(`Invalid researchProject interaction kind: ${input.kind}`);
  }
}

function assertInteractionStatus(input: { status: string }): asserts input is {
  status: ResearchProjectInteractionStatus;
} {
  if (!interactionStatuses.has(input.status as ResearchProjectInteractionStatus)) {
    throw new Error(`Invalid researchProject interaction status: ${input.status}`);
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
    throw new Error(`Question interaction cannot transition to status: ${status}`);
  }
  if (kind === "baseline_confirmation" && !["confirmed", "rejected", "canceled"].includes(status)) {
    throw new Error(`Baseline confirmation cannot transition to status: ${status}`);
  }
}

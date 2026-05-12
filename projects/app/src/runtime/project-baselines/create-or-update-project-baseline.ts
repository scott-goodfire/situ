import { eq } from "drizzle-orm";

import { baselineActivities, baselineRepository, baselines } from "@situ/research-records";
import { researchProjectRepository } from "@situ/research-projects";

import { researchProjects } from "../../data/db/schema";
import { runSyncedWrite } from "../../data/db/sync";
import { dateTimeModule } from "../../modules/date-time";
import { textModule } from "../../modules/text";

type BaselineRecord = Awaited<ReturnType<typeof baselineRepository.require>>;

/**
 * Cross-domain wrapper that updates the research_project's `phase` and
 * `baseline_summary` alongside the baseline write — both happen in one
 * synced transaction so a Replicache poke fans out a consistent snapshot.
 *
 * Lives in the app rather than `@situ/research-records` because it touches
 * the `research_projects` table, which is owned by the app.
 */
export async function createOrUpdateProjectBaseline({
  researchProjectId,
  title,
  summary,
  createdByAgentId,
  payload = {},
}: {
  researchProjectId: string;
  title: string;
  summary: string;
  createdByAgentId?: string;
  payload?: Record<string, unknown>;
}): Promise<BaselineRecord> {
  await researchProjectRepository.require({ researchProjectId });
  const current = await baselineRepository.findProjectBaseline({ researchProjectId });
  const normalizedTitle = textModule.requiredText({ value: title, label: "title" });
  const normalizedSummary = textModule.requiredText({ value: summary, label: "summary" });
  const now = dateTimeModule.nowIso();
  if (!current) {
    const baselineId = crypto.randomUUID();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.insert(baselines)
          .values({
            id: baselineId,
            researchProjectId,
            title: normalizedTitle,
            summary: normalizedSummary,
            createdByAgentId,
            status: "active",
            payloadJson: JSON.stringify(payload),
            syncVersion,
            syncDeleted: false,
            createdAt: now,
            updatedAt: now,
          })
          .run();
        db.insert(baselineActivities)
          .values({
            baselineId,
            actorAgentId: createdByAgentId,
            actor: "manager",
            kind: "recorded",
            body: normalizedSummary,
            payloadJson: JSON.stringify({ activityType: "project_baseline_created" }),
            syncVersion,
            syncDeleted: false,
          })
          .run();
        db.update(researchProjects)
          .set({
            phase: "baseline",
            baselineSummary: normalizedSummary,
            syncVersion,
            updatedAt: now,
          })
          .where(eq(researchProjects.id, researchProjectId))
          .run();
      },
    });
    return baselineRepository.require({ baselineId });
  }

  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      db.update(baselines)
        .set({
          title: normalizedTitle,
          summary: normalizedSummary,
          status: "active",
          payloadJson: JSON.stringify(payload),
          syncVersion,
          updatedAt: now,
        })
        .where(eq(baselines.id, current.id))
        .run();
      db.insert(baselineActivities)
        .values({
          baselineId: current.id,
          actorAgentId: createdByAgentId,
          actor: "manager",
          kind: "comment",
          body: normalizedSummary,
          payloadJson: JSON.stringify({ activityType: "project_baseline_revised" }),
          syncVersion,
          syncDeleted: false,
        })
        .run();
      db.update(researchProjects)
        .set({
          phase: "baseline",
          baselineSummary: normalizedSummary,
          syncVersion,
          updatedAt: now,
        })
        .where(eq(researchProjects.id, researchProjectId))
        .run();
    },
  });
  return baselineRepository.require({ baselineId: current.id });
}

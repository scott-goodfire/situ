import { eq } from "drizzle-orm";

import { getRuntimeContext } from "../../config/session-context";
import { ensureLocalSession } from "../../claude/agents/resources";
import { session as sessionTable } from "../../data/db/schema";
import { runSyncedWrite } from "../../data/db/sync";
import { researchProjectRepository } from "../../data/repositories/research-projects";
import { dateTimeModule } from "../../modules/date-time";
import { textModule } from "../../modules/text";
import { enqueueManagerResearchProjectWork } from "../dispatch";
import type { ResearchProjectExecutionMode } from "../../data/repositories/research-projects";

export type SeedObjectiveResult = {
  researchProject: Awaited<ReturnType<typeof researchProjectRepository.create>>;
};

export async function seedSessionObjective({
  objective,
  executionMode = "interactive",
}: {
  objective: string;
  executionMode?: ResearchProjectExecutionMode;
}): Promise<SeedObjectiveResult> {
  const normalizedObjective = textModule.requiredText({
    value: objective,
    label: "objective",
  });
  await ensureLocalSession();
  const runtime = getRuntimeContext();
  const now = dateTimeModule.nowIso();
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      db.update(sessionTable)
        .set({
          objective: normalizedObjective,
          syncVersion,
          updatedAt: now,
        })
        .where(eq(sessionTable.id, runtime.sessionId))
        .run();
    },
  });

  const researchProject = await researchProjectRepository.create({
    goal: normalizedObjective,
    payload: {
      objective: normalizedObjective,
      rootObjective: true,
      executionMode,
      headless: executionMode === "headless",
    },
  });
  await enqueueManagerResearchProjectWork({ researchProjectId: researchProject.id });
  return { researchProject };
}

import { feedEntryRepository } from "../../data/repositories/feed-entries";
import { researchProjectRepository } from "../../data/repositories/research-projects";
import { dateTimeModule } from "../../modules/date-time";
import { enqueueWorkItem } from "../work-items/enqueue-work-item";
import { CLAUDE_SCRIBE_SESSION_WORK_ITEM_PURPOSE } from "../work-items/types";
import { scribeIntervalMs } from "./scribe-interval";

export async function dispatchScribeNarrationIfDue(): Promise<void> {
  const project = await researchProjectRepository.findActive();
  if (!project) {
    return;
  }
  const nowMs = Date.now();
  const projectStartMs = Date.parse(project.createdAt);
  const sessionAgeSeconds = Math.max(0, Math.floor((nowMs - projectStartMs) / 1000));
  const intervalMs = scribeIntervalMs({ sessionAgeSeconds });

  const latest = await feedEntryRepository.latest({ researchProjectId: project.id });
  if (latest) {
    const elapsedMs = nowMs - Date.parse(latest.createdAt);
    if (elapsedMs < intervalMs) {
      return;
    }
  }

  await enqueueWorkItem({
    purpose: CLAUDE_SCRIBE_SESSION_WORK_ITEM_PURPOSE,
    targetKind: "researchProject",
    targetId: project.id,
    payload: {
      researchProjectId: project.id,
      researchProjectPhase: project.phase,
    },
    availableAt: dateTimeModule.nowIso(),
  });
}

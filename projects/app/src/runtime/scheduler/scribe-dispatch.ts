import { enqueueClaudeAgentWork } from "../../claude/agents/runs";
import { feedEntryRepository } from "../../data/repositories/feed-entries";
import { researchProjectRepository } from "../../data/repositories/research-projects";
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

  const content = [
    `Narrate the latest activity in research project ${project.id}.`,
    `Goal: ${project.goal}`,
    `Phase: ${project.phase}`,
    "",
    "Read the recent app events and write 1–2 short paragraphs via write_feed_entry. Cite event IDs inline. Do not restate prior narrations.",
  ].join("\n");

  await enqueueClaudeAgentWork({
    purpose: CLAUDE_SCRIBE_SESSION_WORK_ITEM_PURPOSE,
    targetKind: "researchProject",
    targetId: project.id,
    content,
    payload: {
      researchProjectId: project.id,
      researchProjectPhase: project.phase,
    },
  });
}

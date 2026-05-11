import { appEventsSyncPatch } from "./app-events";
import { artifactsSyncPatch } from "./artifacts";
import { baselineActivitiesSyncPatch } from "./baseline-activities";
import { baselinesSyncPatch } from "./baselines";
import { claudeAgentEnvironmentsSyncPatch } from "./claude-agent-environments";
import { claudeAgentEventsSyncPatch } from "./claude-agent-events";
import { claudeAgentRunsSyncPatch } from "./claude-agent-runs";
import { claudeAgentsSyncPatch } from "./claude-agents";
import { computeTargetsSyncPatch } from "./compute-targets";
import { entityLinksSyncPatch } from "./entity-links";
import { evaluationActivitiesSyncPatch } from "./evaluation-activities";
import { evaluationsSyncPatch } from "./evaluations";
import { experimentActivitiesSyncPatch } from "./experiment-activities";
import { experimentsSyncPatch } from "./experiments";
import { hypothesesSyncPatch } from "./hypotheses";
import { hypothesisActivitiesSyncPatch } from "./hypothesis-activities";
import { localSettingsSyncPatch } from "./local-settings";
import { measurementsSyncPatch } from "./measurements";
import { researchProjectInteractionsSyncPatch } from "./research-project-interactions";
import { researchProjectsSyncPatch } from "./research-projects";
import { researchTaskVerificationsSyncPatch } from "./research-task-verifications";
import { researchTasksSyncPatch } from "./research-tasks";
import { workItemsSyncPatch } from "./work-items";
import type { ReplicacheSyncInput, ReplicacheSyncPatch } from "./types";

export { sessionSyncPatch } from "./session";

const replicacheSyncCollections: ReplicacheSyncPatch[] = [
  localSettingsSyncPatch,
  claudeAgentsSyncPatch,
  claudeAgentEnvironmentsSyncPatch,
  claudeAgentRunsSyncPatch,
  claudeAgentEventsSyncPatch,
  appEventsSyncPatch,
  researchProjectsSyncPatch,
  researchProjectInteractionsSyncPatch,
  researchTasksSyncPatch,
  researchTaskVerificationsSyncPatch,
  workItemsSyncPatch,
  hypothesesSyncPatch,
  experimentsSyncPatch,
  baselinesSyncPatch,
  evaluationsSyncPatch,
  measurementsSyncPatch,
  artifactsSyncPatch,
  entityLinksSyncPatch,
  hypothesisActivitiesSyncPatch,
  experimentActivitiesSyncPatch,
  baselineActivitiesSyncPatch,
  evaluationActivitiesSyncPatch,
  computeTargetsSyncPatch,
];

export async function replicacheSyncPatch(input: ReplicacheSyncInput) {
  const patches = await Promise.all(
    replicacheSyncCollections.map((syncCollection) => syncCollection(input)),
  );
  return patches.flat();
}

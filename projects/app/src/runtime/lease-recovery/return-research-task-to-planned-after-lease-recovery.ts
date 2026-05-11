import { recordAppEvent } from "../../app-events";
import { researchTaskRepository } from "../../data/repositories/research-tasks";

export async function returnResearchTaskToPlannedAfterLeaseRecovery({
  researchTaskId,
  computeTargetId,
}: {
  researchTaskId: string;
  computeTargetId: string;
}): Promise<void> {
  await researchTaskRepository.transition({
    researchTaskId,
    status: "planned",
    resultSummary: "Recovered expired compute lease; ResearchTask returned to planned.",
  });
  await recordAppEvent({
    type: "research_task.compute_lease_recovered",
    message: `Recovered expired compute lease ${computeTargetId}; ResearchTask returned to planned.`,
    payload: {
      computeTargetId,
      researchTaskId,
    },
  });
}

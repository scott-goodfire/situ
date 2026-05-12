import { artifactRepository } from "@situ/research-records";
import { baselineRepository } from "@situ/research-records";
import { computeTargetRepository } from "@situ/compute";
import { evaluationRepository } from "@situ/research-records";
import { experimentRepository } from "@situ/research-records";
import { hypothesisRepository } from "@situ/research-records";
import { measurementRepository } from "@situ/research-records";
import { researchTaskRepository } from "../../../../data/repositories/research-tasks";

export const ENTITY_KINDS = [
  "research_task",
  "hypothesis",
  "baseline",
  "experiment",
  "evaluation",
  "measurement",
  "artifact",
  "compute_target",
] as const;

const entityKinds = new Set<EntityKind>(ENTITY_KINDS);

type EntityKind = (typeof ENTITY_KINDS)[number];

async function assertExists({ kind, id }: { kind: EntityKind; id: string }): Promise<void> {
  switch (kind) {
    case "research_task":
      await researchTaskRepository.require({ researchTaskId: id });
      return;
    case "hypothesis":
      await hypothesisRepository.require({ hypothesisId: id });
      return;
    case "baseline":
      await baselineRepository.require({ baselineId: id });
      return;
    case "experiment":
      await experimentRepository.require({ experimentId: id });
      return;
    case "evaluation":
      await evaluationRepository.require({ evaluationId: id });
      return;
    case "measurement":
      await measurementRepository.require({ measurementId: id });
      return;
    case "artifact":
      await artifactRepository.require({ artifactId: id });
      return;
    case "compute_target":
      await computeTargetRepository.require({ computeTargetId: id });
      return;
  }
}

export const toolEntityReferenceModule = {
  assertExists,
  entityKinds,
} as const;

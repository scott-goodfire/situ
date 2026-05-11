import {
  ActivitiesView,
  type ResearchProjectInteractionRecord as UiResearchProjectInteractionRecord,
} from "@situ/web-app-ui";
import type { ResearchProjectInteractionRecord } from "@situ/protocol";
import { useResearchProjectInteractions, useResearchProjects } from "../../hooks/research-projects";
import { researchProjectModule } from "../../modules/research-project";

export function ActivitiesPage() {
  const researchProjects = useResearchProjects();
  const interactions = useResearchProjectInteractions();
  const project = researchProjectModule.currentResearchProjectFrom({ researchProjects });
  const projectInteractions = interactions.filter(
    (interaction) => interaction.researchProjectId === project?.id,
  );
  return (
    <ActivitiesView
      interactions={projectInteractions.map((interaction) => adaptInteraction({ interaction }))}
    />
  );
}

function adaptInteraction({
  interaction,
}: {
  interaction: ResearchProjectInteractionRecord;
}): UiResearchProjectInteractionRecord {
  return {
    id: interaction.id,
    projectId: interaction.researchProjectId,
    kind: interaction.kind,
    prompt: interaction.prompt,
    details: interaction.details,
    status: interaction.status,
    response: interaction.response,
    createdAt: interaction.createdAt,
    updatedAt: interaction.updatedAt,
  };
}

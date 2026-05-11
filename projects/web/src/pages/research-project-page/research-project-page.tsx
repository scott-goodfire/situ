import {
  ResearchProjectSetupView,
  type ResearchProjectInteractionRecord as UiResearchProjectInteractionRecord,
  type ResearchProjectRecord as UiResearchProjectRecord,
  type ResearchProjectStatus,
} from "@situ/web-app-ui";
import type { ResearchProjectInteractionRecord, ResearchProjectRecord } from "@situ/protocol";
import { useLocalSettings } from "../../hooks/local-settings";
import { useResearchProjectInteractions, useResearchProjects } from "../../hooks/research-projects";
import { httpJsonModule } from "../../modules/http-json";
import { pageTitleModule } from "../../modules/page-title";

export function ResearchProjectPage({
  researchProjects: initialResearchProjects,
}: {
  researchProjects?: ResearchProjectRecord[];
} = {}) {
  const localSettings = useLocalSettings();
  const subscribedResearchProjects = useResearchProjects();
  const researchProjects = initialResearchProjects ?? subscribedResearchProjects;
  const researchProjectInteractions = useResearchProjectInteractions();
  return (
    <ResearchProjectSetupView
      projects={researchProjects.map((project) => adaptProject({ project }))}
      interactions={researchProjectInteractions.map((interaction) =>
        adaptInteraction({ interaction }),
      )}
      anthropicKeyConfigured={localSettings?.anthropicKeyConfigured === true}
      onCreateResearchProject={async (input) => {
        await httpJsonModule.postJson({ path: "/api/research-projects", body: input });
      }}
      onAnswerInteraction={async ({ interactionId, response }) => {
        await httpJsonModule.postJson({
          path: `/api/research-project-interactions/${interactionId}/answer`,
          body: { response },
        });
      }}
      onConfirmInteraction={async ({ interactionId, response }) => {
        await httpJsonModule.postJson({
          path: `/api/research-project-interactions/${interactionId}/confirm`,
          body: { response },
        });
      }}
      onRejectInteraction={async ({ interactionId, response }) => {
        await httpJsonModule.postJson({
          path: `/api/research-project-interactions/${interactionId}/reject`,
          body: { response },
        });
      }}
    />
  );
}

function adaptProject({ project }: { project: ResearchProjectRecord }): UiResearchProjectRecord {
  return {
    id: project.id,
    title: pageTitleModule.titleFromGoal({ goal: project.goal }),
    goal: project.goal,
    status: statusForProject({ project }),
    baselineSummary: project.baselineSummary,
    currentDecision: project.status === "blocked_on_user" ? "Waiting for user input." : null,
    reportSummary: project.resultSummary,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
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

function statusForProject({ project }: { project: ResearchProjectRecord }): ResearchProjectStatus {
  switch (project.status) {
    case "active":
      return project.phase === "onboarding" || project.phase === "baseline"
        ? "onboarding"
        : "researching";
    case "blocked_on_user":
      return "blocked";
    case "complete":
      return "complete";
    case "failed":
    case "canceled":
      return project.status;
  }
}

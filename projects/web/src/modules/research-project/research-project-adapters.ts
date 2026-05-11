import type {
  ResearchProjectInteractionRecord as UiResearchProjectInteractionRecord,
  ResearchProjectRecord as UiResearchProjectRecord,
  ResearchProjectStatus,
  ResearchTaskRecord as UiResearchTaskRecord,
  ResearchTaskStatus,
  ResearchTaskVerificationRecord as UiResearchTaskVerificationRecord,
} from "@situ/web-app-ui";
import type {
  ResearchProjectInteractionRecord,
  ResearchProjectRecord,
  ResearchTaskRecord,
  ResearchTaskVerificationRecord,
} from "@situ/protocol";
import { pageTitleModule } from "../page-title";

export const researchProjectAdapters = {
  toProject,
  toResearchTask,
  toVerification,
  toInteraction,
};

function toProject({ project }: { project: ResearchProjectRecord }): UiResearchProjectRecord {
  return {
    id: project.id,
    title: pageTitleModule.titleFromGoal({ goal: project.goal }),
    goal: project.goal,
    status: toProjectStatus({ project }),
    baselineSummary: project.baselineSummary,
    currentDecision: project.status === "blocked_on_user" ? "Waiting for user input." : null,
    reportSummary: project.resultSummary,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function toProjectStatus({ project }: { project: ResearchProjectRecord }): ResearchProjectStatus {
  if (
    project.status === "complete" ||
    project.status === "failed" ||
    project.status === "canceled"
  ) {
    return project.status;
  }
  if (project.status === "blocked_on_user") {
    return "blocked";
  }
  switch (project.phase) {
    case "onboarding":
    case "baseline":
      return "onboarding";
    case "search":
      return "researching";
    case "reporting":
      return "reporting";
    case "complete":
      return "complete";
  }
}

function toResearchTask({
  researchTask,
}: {
  researchTask: ResearchTaskRecord;
}): UiResearchTaskRecord {
  return {
    id: researchTask.id,
    projectId: researchTask.researchProjectId,
    parentResearchTaskId: researchTask.parentResearchTaskId,
    type: researchTask.type,
    title: researchTask.title,
    summary: researchTask.resultSummary ?? researchTask.workerPrompt,
    workerPrompt: researchTask.workerPrompt,
    verificationPrompt: researchTask.verificationPrompt,
    status: toResearchTaskStatus({ status: researchTask.status }),
    priority: researchTask.priority,
    hypothesisId: researchTask.targetKind === "hypothesis" ? researchTask.targetId : null,
    evidenceCount: researchTask.resultSummary ? 1 : 0,
    createdAt: researchTask.createdAt,
    updatedAt: researchTask.updatedAt,
  };
}

function toResearchTaskStatus({
  status,
}: {
  status: ResearchTaskRecord["status"];
}): ResearchTaskStatus {
  switch (status) {
    case "awaiting_verification":
      return "verifying";
    case "canceled":
      return "pruned";
    default:
      return status;
  }
}

function toVerification({
  verification,
}: {
  verification: ResearchTaskVerificationRecord;
}): UiResearchTaskVerificationRecord {
  return {
    id: verification.id,
    researchTaskId: verification.researchTaskId,
    status: toVerificationStatus({ status: verification.status }),
    verifier: verification.profile,
    summary: verification.judgment,
    evidence: verification.evidenceSummary ? [verification.evidenceSummary] : [],
    createdAt: verification.createdAt,
    updatedAt: verification.updatedAt,
  };
}

function toVerificationStatus({
  status,
}: {
  status: ResearchTaskVerificationRecord["status"];
}): UiResearchTaskVerificationRecord["status"] {
  switch (status) {
    case "passed":
      return "pass";
    case "failed":
      return "fail";
    case "suspicious":
    case "needs_more_evidence":
      return status;
  }
}

function toInteraction({
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

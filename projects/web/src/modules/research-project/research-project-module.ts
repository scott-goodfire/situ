import type { ResearchProjectRecord } from "@situ/protocol";

export const researchProjectModule = {
  currentResearchProjectFrom,
  isResearchProjectPastOnboarding,
  isTerminalResearchProject,
};

function currentResearchProjectFrom({
  researchProjects,
}: {
  researchProjects: ResearchProjectRecord[];
}): ResearchProjectRecord | undefined {
  const sorted = [...researchProjects].sort(compareResearchProjects);
  return (
    sorted.find((researchProject) => !isTerminalResearchProject({ researchProject })) ?? sorted[0]
  );
}

function isResearchProjectPastOnboarding({
  researchProject,
}: {
  researchProject: ResearchProjectRecord;
}): boolean {
  return researchProject.phase !== "onboarding" || researchProject.status === "complete";
}

function isTerminalResearchProject({
  researchProject,
}: {
  researchProject: ResearchProjectRecord;
}): boolean {
  return (
    researchProject.status === "complete" ||
    researchProject.status === "failed" ||
    researchProject.status === "canceled"
  );
}

function compareResearchProjects(
  left: ResearchProjectRecord,
  right: ResearchProjectRecord,
): number {
  const updatedComparison = right.updatedAt.localeCompare(left.updatedAt);
  if (updatedComparison !== 0) {
    return updatedComparison;
  }
  const createdComparison = right.createdAt.localeCompare(left.createdAt);
  if (createdComparison !== 0) {
    return createdComparison;
  }
  return right.id.localeCompare(left.id);
}

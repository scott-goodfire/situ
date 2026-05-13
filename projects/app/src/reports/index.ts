import type { AppRepositories } from "../actions/repositories";
import { deriveFrontier } from "../frontier";

export type GenerateProjectReportInput = {
  projectId: string;
  repositories: AppRepositories;
};

const listSection = ({ items, title }: { items: string[]; title: string }): string => {
  if (items.length === 0) {
    return [`## ${title}`, "", "- None"].join("\n");
  }

  return [`## ${title}`, "", ...items.map((item) => `- ${item}`)].join("\n");
};

/**
 * Generates a project report.
 */
export const generateProjectReport = ({
  projectId,
  repositories,
}: GenerateProjectReportInput): string => {
  const project = repositories.projects.require({ id: projectId });
  const tasks = repositories.tasks.listByProject({ projectId });
  const experiments = repositories.experiments.listByProject({ projectId });
  const measurements = repositories.measurements.listByProject({ projectId });
  const reviews = repositories.reviews.listByProject({ projectId });
  const artifacts = repositories.artifacts.listByProject({ projectId });
  const frontier = deriveFrontier({ projectId, repositories });

  return [
    `# Report: ${project.id}`,
    "",
    "## Goal",
    "",
    project.goalMarkdown,
    "",
    "## Current Answer",
    "",
    project.currentAnswerSummary,
    "",
    listSection({
      title: "Tasks",
      items: tasks.map((task) => `${task.id}: ${task.status} - ${task.title}`),
    }),
    "",
    listSection({
      title: "Experiments",
      items: experiments.map(
        (experiment) =>
          `${experiment.id}: ${experiment.status} at ${experiment.currentCandidateCommit} - ${experiment.title}`,
      ),
    }),
    "",
    listSection({
      title: "Measurements",
      items: measurements.map(
        (measurement) =>
          `${measurement.id}: ${measurement.name} on ${measurement.observedCommit ?? "current target"} - ${measurement.summaryMarkdown}`,
      ),
    }),
    "",
    listSection({
      title: "Reviews",
      items: reviews.map(
        (review) =>
          `${review.id}: ${review.status} on ${review.reviewedCommit ?? "current target"} - ${review.rationaleMarkdown}`,
      ),
    }),
    "",
    listSection({
      title: "Artifacts",
      items: artifacts.map((artifact) => `${artifact.id}: ${artifact.type} - ${artifact.title}`),
    }),
    "",
    listSection({
      title: "Best Candidates",
      items: frontier.bestCandidates.map(
        (experiment) => `${experiment.id}: ${experiment.currentCandidateCommit}`,
      ),
    }),
  ].join("\n");
};

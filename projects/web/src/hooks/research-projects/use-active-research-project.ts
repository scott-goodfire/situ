import type { ResearchProjectRecord } from "@situ/protocol";
import { useResearchProjects } from "./use-research-projects";
import { isProjectKickedOff } from "./is-project-kicked-off";

export function useActiveResearchProject(): {
  project: ResearchProjectRecord | undefined;
  isKickedOff: boolean;
} {
  const projects = useResearchProjects();
  const project = projects.find(
    (candidate) => !["complete", "failed", "canceled"].includes(candidate.status),
  );
  if (!project) {
    return { project: undefined, isKickedOff: false };
  }
  return { project, isKickedOff: isProjectKickedOff({ project }) };
}

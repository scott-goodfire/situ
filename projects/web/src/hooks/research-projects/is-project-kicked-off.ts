import type { ResearchProjectRecord } from "@situ/protocol";

export function isProjectKickedOff({ project }: { project: ResearchProjectRecord }): boolean {
  return !["onboarding", "baseline"].includes(project.phase);
}

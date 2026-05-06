import { Text } from "ink";
import type { ProjectRecord, SessionRecord } from "@situ/protocol";
import { PaneSection } from "../pane-section/pane-section.js";

export function SessionSection({
  project,
  session,
  experimentCount,
  maxExperiments,
}: {
  project: ProjectRecord | undefined;
  session: SessionRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
}) {
  return (
    <PaneSection title="Session">
      <Text>
        {sessionLabel({
          project,
          session,
          experimentCount,
          maxExperiments,
        })}
      </Text>
    </PaneSection>
  );
}

function sessionLabel({
  project,
  session,
  experimentCount,
  maxExperiments,
}: {
  project: ProjectRecord | undefined;
  session: SessionRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
}): string {
  if (!session) {
    return project ? `${project.title} | no session yet` : "No session yet";
  }

  const objectiveLabel = project?.objective ?? "(no objective)";
  const contextSuffix = project?.research_context
    ? ` | ${project.research_context}`
    : "";
  return `${session.id} | ${session.status} | ${objectiveLabel} | experiments ${experimentCount}/${maxExperiments}${contextSuffix}`;
}

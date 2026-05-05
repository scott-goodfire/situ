import { Text } from "ink";
import type {
  ObjectiveRecord,
  ResearchContextRecord,
  SessionRecord,
} from "@situ/protocol";
import { PaneSection } from "../pane-section/pane-section.js";

export function SessionSection({
  objective,
  researchContext,
  session,
  experimentCount,
  maxExperiments,
}: {
  objective: ObjectiveRecord | undefined;
  researchContext?: ResearchContextRecord | undefined;
  session: SessionRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
}) {
  return (
    <PaneSection title="Session">
      <Text>
        {sessionLabel({
          objective,
          researchContext,
          session,
          experimentCount,
          maxExperiments,
        })}
      </Text>
    </PaneSection>
  );
}

function sessionLabel({
  objective,
  researchContext,
  session,
  experimentCount,
  maxExperiments,
}: {
  objective: ObjectiveRecord | undefined;
  researchContext: ResearchContextRecord | undefined;
  session: SessionRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
}): string {
  if (!session) {
    return objective ? `${objective.title} | no session yet` : "No session yet";
  }

  const objectiveLabel = objective?.title ?? "(no objective)";
  const contextSuffix = researchContext?.body ? ` | ${researchContext.body}` : "";
  return `${session.id} | ${session.status} | ${objectiveLabel} | experiments ${experimentCount}/${maxExperiments}${contextSuffix}`;
}

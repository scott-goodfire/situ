import { Text } from "ink";
import type { ObjectiveRecord, SessionRecord } from "@almanac/protocol";
import { Section } from "../section/section.js";

export function SessionSection({
  objective,
  session,
  experimentCount,
  maxExperiments,
}: {
  objective: ObjectiveRecord | undefined;
  session: SessionRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
}) {
  return (
    <Section title="Session">
      <Text>{sessionLabel({ objective, session, experimentCount, maxExperiments })}</Text>
    </Section>
  );
}

function sessionLabel({
  objective,
  session,
  experimentCount,
  maxExperiments,
}: {
  objective: ObjectiveRecord | undefined;
  session: SessionRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
}): string {
  if (!session) {
    return objective ? `${objective.title} | no session yet` : "No session yet";
  }

  const objectiveLabel = objective?.title ?? session.objective_id;
  return `${session.id} | ${session.status} | ${objectiveLabel} | experiments ${experimentCount}/${maxExperiments}`;
}

import type { ObjectiveRecord, SessionRecord } from "@almanac/protocol";
import { DxSection } from "@almanac/web-ui";

export function RunSummary({
  objective,
  session,
  experimentCount,
  hypothesisCount,
}: {
  objective: ObjectiveRecord | undefined;
  session: SessionRecord | undefined;
  experimentCount: number;
  hypothesisCount: number;
}) {
  return (
    <DxSection title="Session">
      <p>{sessionLabel({ objective, session, experimentCount, hypothesisCount })}</p>
    </DxSection>
  );
}

function sessionLabel({
  objective,
  session,
  experimentCount,
  hypothesisCount,
}: {
  objective: ObjectiveRecord | undefined;
  session: SessionRecord | undefined;
  experimentCount: number;
  hypothesisCount: number;
}): string {
  if (!session) {
    return objective ? `${objective.title} | no session yet` : "No session yet";
  }

  return `${session.id} | ${session.status} | hypotheses ${hypothesisCount} | experiments ${experimentCount}`;
}

import type {
  ExperimentRecord,
  HypothesisRecord,
  ObjectiveRecord,
  SessionRecord,
} from "@almanac/protocol";
import filter from "lodash/filter";
import orderBy from "lodash/orderBy";
import type { ProjectWorkspaceData } from "../types";

export function activeObjectiveFor({
  objectives,
}: {
  objectives: ObjectiveRecord[];
}): ObjectiveRecord | undefined {
  return (
    objectives.find((objective) => objective.status === "active") ??
    objectives.at(-1)
  );
}

export function latestSessionFor({
  sessions,
}: {
  sessions: SessionRecord[];
}): SessionRecord | undefined {
  return sessions.at(-1);
}

export function hypothesesForObjective({
  data,
  objective,
}: {
  data: ProjectWorkspaceData;
  objective: ObjectiveRecord | undefined;
}): HypothesisRecord[] {
  if (!objective) {
    return [];
  }

  return filter(
    data.hypotheses,
    (hypothesis) => hypothesis.objective_id === objective.id,
  );
}

export function overviewHypotheses({
  data,
  objective,
}: {
  data: ProjectWorkspaceData;
  objective: ObjectiveRecord | undefined;
}): HypothesisRecord[] {
  const hypotheses = hypothesesForObjective({
    data,
    objective,
  });

  return orderBy(
    hypotheses,
    [(hypothesis) => statusRank({ status: hypothesis.status }), (hypothesis) => hypothesis.updated_at],
    ["asc", "desc"],
  );
}

export function experimentsForSession({
  data,
  session,
}: {
  data: ProjectWorkspaceData;
  session: SessionRecord | undefined;
}): ExperimentRecord[] {
  if (!session) {
    return [];
  }

  return filter(
    data.experiments,
    (experiment) => experiment.associated_session_id === session.id,
  );
}

export function activeExperimentFor({
  experiments,
}: {
  experiments: ExperimentRecord[];
}): ExperimentRecord | undefined {
  return experiments.find((experiment) => experiment.status === "active");
}

function statusRank({
  status,
}: {
  status: HypothesisRecord["status"];
}): number {
  if (status === "active") {
    return 0;
  }

  if (status === "open") {
    return 1;
  }

  return 2;
}

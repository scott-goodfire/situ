import type {
  ExperimentRecord,
  HypothesisRecord,
  ObjectiveRecord,
  SessionRecord,
} from "@situ/protocol";
import filter from "lodash/filter";
import orderBy from "lodash/orderBy";
import type { ProjectWorkspaceData } from "../types";

export function activeObjectiveFor({
  objectives,
  session,
}: {
  objectives: ObjectiveRecord[];
  session: SessionRecord | undefined;
}): ObjectiveRecord | undefined {
  if (session) {
    const objective = objectives.find((item) => item.session_id === session.id);
    if (objective) {
      return objective;
    }
  }

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

export function hypothesesForSession({
  data,
  session,
}: {
  data: ProjectWorkspaceData;
  session: SessionRecord | undefined;
}): HypothesisRecord[] {
  if (!session) {
    return [];
  }

  return filter(data.hypotheses, (hypothesis) => hypothesis.session_id === session.id);
}

export function overviewHypotheses({
  data,
  session,
}: {
  data: ProjectWorkspaceData;
  session: SessionRecord | undefined;
}): HypothesisRecord[] {
  const hypotheses = hypothesesForSession({
    data,
    session,
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

  return filter(data.experiments, (experiment) => experiment.session_id === session.id);
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

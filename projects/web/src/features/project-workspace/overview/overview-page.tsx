import { HypothesisCycle } from "./hypothesis-cycle";
import {
  activeObjectiveFor,
  overviewHypotheses,
} from "./selectors";
import type { ProjectWorkspaceData } from "../types";

export function OverviewPage({ data }: { data: ProjectWorkspaceData }) {
  const activeObjective = activeObjectiveFor({ objectives: data.objectives });
  const visibleHypotheses = overviewHypotheses({
    data,
    objective: activeObjective,
  });

  return <HypothesisCycle data={data} hypotheses={visibleHypotheses} />;
}

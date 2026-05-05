import { HypothesisCycle } from "./hypothesis-cycle";
import {
  latestSessionFor,
  overviewHypotheses,
} from "./selectors";
import type { ProjectWorkspaceData } from "../types";

export function OverviewPage({ data }: { data: ProjectWorkspaceData }) {
  const latestSession = latestSessionFor({ sessions: data.sessions });
  const visibleHypotheses = overviewHypotheses({
    data,
    session: latestSession,
  });

  return <HypothesisCycle data={data} hypotheses={visibleHypotheses} />;
}

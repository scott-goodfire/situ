import type { HypothesisRecord } from "@situ/protocol";
import filter from "lodash/filter";
import orderBy from "lodash/orderBy";
import type { ProjectWorkspaceData } from "../types";

export function overviewHypotheses({
  data,
}: {
  data: ProjectWorkspaceData;
}): HypothesisRecord[] {
  const hypotheses = filter(
    data.hypotheses,
    (hypothesis) => hypothesis.project_id === data.projectId,
  );

  return orderBy(
    hypotheses,
    [(hypothesis) => statusRank({ status: hypothesis.status }), (hypothesis) => hypothesis.updated_at],
    ["asc", "desc"],
  );
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

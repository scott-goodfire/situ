import { useMemo } from "react";
import type { ProjectWorkspaceData } from "../types";
import { LineageDetailPanel } from "./lineage-detail-panel";
import { LineageGraph } from "./lineage-graph";
import * as s from "./lineage-page.css";

export function LineagePage({
  data,
  selectedExperimentId,
  onSelect,
}: {
  data: ProjectWorkspaceData;
  selectedExperimentId: string | undefined;
  onSelect: ({ experimentId }: { experimentId: string }) => void;
}) {
  const failedExperimentIds = useMemo(
    () => failedExperimentsFromTasks({ data }),
    [data],
  );

  return (
    <>
      <header className={s.header}>
        <h2 className={s.title}>Lineage</h2>
        <p className={s.subtitle}>
          Experiment branching as the agent has progressed. Click a node for evidence and activity.
        </p>
      </header>
      <div className={s.layout}>
        <div className={s.graphScroll}>
          <LineageGraph
            data={data}
            selectedExperimentId={selectedExperimentId}
            failedExperimentIds={failedExperimentIds}
            onSelect={onSelect}
          />
        </div>
        <div className={s.panelColumn}>
          <LineageDetailPanel data={data} experimentId={selectedExperimentId} />
        </div>
      </div>
    </>
  );
}

function failedExperimentsFromTasks({
  data,
}: {
  data: ProjectWorkspaceData;
}): Set<string> {
  const failedTaskIds = new Set(
    data.tasks
      .filter((task) => task.status === "failed")
      .map((task) => task.id),
  );
  if (failedTaskIds.size === 0) return new Set();

  const failed = new Set<string>();
  for (const link of data.taskEntityLinks) {
    if (link.entity_kind !== "experiment") continue;
    if (!failedTaskIds.has(link.task_id)) continue;
    failed.add(link.entity_id);
  }
  return failed;
}

import type { ExperimentRecord } from "@situ/protocol";
import { useMemo } from "react";
import {
  experimentLineageGraph,
  experimentActivitiesByExperiment,
  hypothesisLabelsByExperiment,
  criticStatusForExperiment,
  type CriticStatus,
} from "../../../selectors/experiments";
import type { ProjectWorkspaceData } from "../types";
import { LineageNode } from "./lineage-node";
import * as s from "./lineage-graph.css";
import {
  LANE_AREA_PADDING,
  LANE_DOT_RADIUS,
  LANE_STROKE_WIDTH,
  LANE_WIDTH,
  ROW_HEIGHT,
} from "./__shared__/constants";

export function LineageGraph({
  data,
  selectedExperimentId,
  failedExperimentIds,
  onSelect,
}: {
  data: ProjectWorkspaceData;
  selectedExperimentId: string | undefined;
  failedExperimentIds: Set<string>;
  onSelect: ({ experimentId }: { experimentId: string }) => void;
}) {
  const layout = useMemo(() => experimentLineageGraph({ data }), [data]);
  const hypothesisIdsByExperiment = useMemo(
    () => hypothesisLabelsByExperiment({ data }),
    [data],
  );
  const activitiesByExperiment = useMemo(
    () => experimentActivitiesByExperiment({ data }),
    [data],
  );
  const experimentsById = useMemo(
    () => indexById({ experiments: data.experiments }),
    [data.experiments],
  );

  if (layout.positions.length === 0) {
    return <p className={s.empty}>No experiments yet — start a session to populate the lineage.</p>;
  }

  const laneAreaWidth = layout.laneCount * LANE_WIDTH + LANE_AREA_PADDING * 2;
  const totalHeight = layout.positions.length * ROW_HEIGHT;

  return (
    <div className={s.container}>
      <div className={s.laneArea} style={{ width: laneAreaWidth }}>
        <svg
          className={s.laneSvg}
          width={laneAreaWidth}
          height={totalHeight}
          aria-hidden="true"
        >
          {layout.edges.map((edge) => (
            <path
              key={`${edge.fromId}->${edge.toId}`}
              className={s.lanePipe}
              strokeWidth={LANE_STROKE_WIDTH}
              d={pathFor({ edge })}
            />
          ))}
          {layout.positions.map((position) => {
            const experiment = experimentsById.get(position.experimentId);
            if (!experiment) return null;
            const tone = dotTone({
              experiment,
              criticStatus: criticStatusForExperiment({
                activities: activitiesByExperiment.get(experiment.id) ?? [],
              }),
              isFailed: failedExperimentIds.has(experiment.id),
            });
            return (
              <circle
                key={position.experimentId}
                className={s.laneDot}
                data-tone={tone}
                cx={LANE_AREA_PADDING + position.lane * LANE_WIDTH + LANE_WIDTH / 2}
                cy={position.row * ROW_HEIGHT + ROW_HEIGHT / 2}
                r={LANE_DOT_RADIUS}
              />
            );
          })}
        </svg>
      </div>
      <ol className={s.rowsColumn} style={{ height: totalHeight }}>
        {layout.positions.map((position) => {
          const experiment = experimentsById.get(position.experimentId);
          if (!experiment) return null;
          const activities = activitiesByExperiment.get(experiment.id) ?? [];
          return (
            <li key={position.experimentId} className={s.rowSlot}>
              <LineageNode
                experiment={experiment}
                hypothesisIds={hypothesisIdsByExperiment.get(experiment.id) ?? []}
                criticStatus={criticStatusForExperiment({ activities })}
                isSelected={position.experimentId === selectedExperimentId}
                isFailed={failedExperimentIds.has(experiment.id)}
                onSelect={onSelect}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function pathFor({
  edge,
}: {
  edge: { fromRow: number; fromLane: number; toRow: number; toLane: number };
}): string {
  const fromX = LANE_AREA_PADDING + edge.fromLane * LANE_WIDTH + LANE_WIDTH / 2;
  const fromY = edge.fromRow * ROW_HEIGHT + ROW_HEIGHT / 2;
  const toX = LANE_AREA_PADDING + edge.toLane * LANE_WIDTH + LANE_WIDTH / 2;
  const toY = edge.toRow * ROW_HEIGHT + ROW_HEIGHT / 2;

  if (edge.fromLane === edge.toLane) {
    return `M ${fromX} ${fromY} L ${toX} ${toY}`;
  }

  // Bend just above the child row so the path stays in the parent lane until
  // it dips into the child's lane.
  const bendY = toY - ROW_HEIGHT / 2;
  return `M ${fromX} ${fromY} L ${fromX} ${bendY} Q ${fromX} ${toY} ${toX} ${toY}`;
}

function dotTone({
  experiment,
  criticStatus,
  isFailed,
}: {
  experiment: ExperimentRecord;
  criticStatus: CriticStatus;
  isFailed: boolean;
}): "neutral" | "warning" | "success" | "danger" {
  if (isFailed) return "danger";
  if (criticStatus === "concern") return "warning";
  if (criticStatus === "reviewed" && experiment.status === "closed") {
    return "success";
  }
  return "neutral";
}

function indexById({
  experiments,
}: {
  experiments: ExperimentRecord[];
}): Map<string, ExperimentRecord> {
  const map = new Map<string, ExperimentRecord>();
  for (const e of experiments) {
    map.set(e.id, e);
  }
  return map;
}

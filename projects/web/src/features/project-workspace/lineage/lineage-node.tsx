import type { ExperimentRecord } from "@situ/protocol";
import { Check, AlertTriangle, CircleDot } from "lucide-react";
import { memo } from "react";
import type { CriticStatus } from "../../../selectors/experiments";
import * as s from "./lineage-node.css";

type NodeTone = "neutral" | "success" | "warning" | "danger";

export const LineageNode = memo(function LineageNode({
  experiment,
  hypothesisIds,
  criticStatus,
  isSelected,
  isFailed,
  onSelect,
}: {
  experiment: ExperimentRecord;
  hypothesisIds: string[];
  criticStatus: CriticStatus;
  isSelected: boolean;
  isFailed: boolean;
  onSelect: ({ experimentId }: { experimentId: string }) => void;
}) {
  const tone = nodeTone({ status: experiment.status, criticStatus, isFailed });

  return (
    <button
      type="button"
      className={s.card}
      data-tone={tone}
      data-selected={isSelected}
      data-failed={isFailed}
      onClick={() => onSelect({ experimentId: experiment.id })}
    >
      <span className={s.idBadge}>{experiment.id}</span>
      <span className={s.body}>
        <span className={s.title}>{experiment.title}</span>
        <span className={s.meta}>
          <span>{experiment.status}</span>
          {hypothesisIds.length > 0 && (
            <span className={s.chips}>
              {hypothesisIds.slice(0, 4).map((id) => (
                <span key={id} className={s.chip}>
                  {id}
                </span>
              ))}
              {hypothesisIds.length > 4 && (
                <span className={s.chip}>+{hypothesisIds.length - 4}</span>
              )}
            </span>
          )}
        </span>
      </span>
      <span className={s.trailing}>
        <span className={s.criticIcon} data-status={criticStatus} title={`critic: ${criticStatus}`}>
          {criticStatus === "reviewed" && <Check size={14} />}
          {criticStatus === "concern" && <AlertTriangle size={14} />}
          {criticStatus === "pending" && <CircleDot size={12} />}
        </span>
      </span>
    </button>
  );
});

function nodeTone({
  status,
  criticStatus,
  isFailed,
}: {
  status: ExperimentRecord["status"];
  criticStatus: CriticStatus;
  isFailed: boolean;
}): NodeTone {
  if (isFailed) return "danger";
  if (criticStatus === "concern") return "warning";
  if (criticStatus === "reviewed" && status === "closed") return "success";
  return "neutral";
}

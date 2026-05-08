import type { ExperimentRecord } from "@situ/protocol";
import { Check, AlertTriangle, CircleDot } from "lucide-react";
import { memo } from "react";
import type { CriticStatus } from "../../../selectors/experiments";
import * as s from "./lineage-node.css";

type NodeTone = "neutral" | "success" | "warning" | "danger";

export const LineageNode = memo(function LineageNode({
  experiment,
  criticStatus,
  isSelected,
  isFailed,
  onSelect,
}: {
  experiment: ExperimentRecord;
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
      <span className={s.title}>{experiment.title}</span>
      <span className={s.trailing}>
        <span className={s.criticIcon} data-status={criticStatus} title={`critic: ${criticStatus}`}>
          {criticStatus === "reviewed" && <Check size={13} />}
          {criticStatus === "concern" && <AlertTriangle size={13} />}
          {criticStatus === "pending" && <CircleDot size={11} />}
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

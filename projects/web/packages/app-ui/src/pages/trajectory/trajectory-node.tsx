import type { ExperimentRecord } from "@situ/protocol";
import { Check, CircleDot } from "lucide-react";
import { memo } from "react";
import { MarkdownText } from "../../shared/markdown-text";
import type { CriticStatus } from "./trajectory-page-view";
import * as s from "./trajectory-node.css";

type NodeTone = "neutral" | "success" | "warning" | "danger";

export const TrajectoryNode = memo(function TrajectoryNode({
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
      <MarkdownText value={experiment.title} variant="inline" className={s.title} />
      <span className={s.trailing}>
        <span className={s.criticIcon} data-status={criticStatus} title={`critic: ${criticStatus}`}>
          {criticStatus === "reviewed" && <Check size={13} />}
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
  if (criticStatus === "reviewed" && status === "done") return "success";
  return "neutral";
}

import type { ArtifactRecord, ExperimentRecord } from "@situ/protocol";
import { DxBadge, DxEmptyState, DxSection, mono, type DxBadgeTone } from "@situ/web-ui";
import { useMemo, useState, type ReactNode } from "react";
import { ActivityTimeline, type ActivityTimelineItem } from "../../shared/activity-timeline";
import { EvaluationActivityListView, type EvaluationActivityListRow } from "../../shared/evidence";
import { MarkdownText } from "../../shared/markdown-text";
import {
  LANE_AREA_PADDING,
  LANE_DOT_RADIUS,
  LANE_STROKE_WIDTH,
  LANE_WIDTH,
  ROW_HEIGHT,
} from "./constants";
import { computeLaneLayout } from "./lane-layout";
import {
  TrajectoryDiffPane,
  type LoadArtifactContent,
  type PatchArtifact,
} from "./trajectory-diff-pane";
import { TrajectoryNode } from "./trajectory-node";
import * as detailStyles from "./trajectory-detail-panel.css";
import * as graphStyles from "./trajectory-graph.css";
import * as pageStyles from "./trajectory-page.css";

export type CriticStatus = "reviewed" | "pending";

export type TrajectoryLinkedItem = {
  id: string;
  title: ReactNode;
  summary?: ReactNode;
};

export type TrajectoryDetailViewData = {
  experiment: ExperimentRecord | undefined;
  parent?: ReactNode;
  linkedHypotheses: TrajectoryLinkedItem[];
  artifacts: Array<
    Pick<ArtifactRecord, "id" | "title" | "path" | "kind" | "media_type" | "size_bytes">
  >;
  evidenceRows: EvaluationActivityListRow[];
  activities: ActivityTimelineItem[];
};

export function TrajectoryPageView({
  experiments,
  selectedExperimentId,
  failedExperimentIds,
  criticStatusByExperimentId,
  detail,
  onSelect,
  loadArtifactContent,
  initialDetailTab = "overview",
}: {
  experiments: ExperimentRecord[];
  selectedExperimentId: string | undefined;
  failedExperimentIds: Set<string>;
  criticStatusByExperimentId: Map<string, CriticStatus>;
  detail: TrajectoryDetailViewData | undefined;
  onSelect: ({ experimentId }: { experimentId: string }) => void;
  loadArtifactContent?: LoadArtifactContent;
  initialDetailTab?: "overview" | "diff";
}) {
  return (
    <>
      <header className={pageStyles.header}>
        <h2 className={pageStyles.title}>Trajectory</h2>
        <p className={pageStyles.subtitle}>
          Experiment branching as the agent has progressed. Click a node for evidence and activity.
        </p>
      </header>
      <div className={pageStyles.layout}>
        <div className={pageStyles.graphScroll}>
          <TrajectoryGraph
            experiments={experiments}
            selectedExperimentId={selectedExperimentId}
            failedExperimentIds={failedExperimentIds}
            criticStatusByExperimentId={criticStatusByExperimentId}
            onSelect={onSelect}
          />
        </div>
        <div className={pageStyles.panelColumn}>
          <TrajectoryDetailPanel
            experimentId={selectedExperimentId}
            detail={detail}
            loadArtifactContent={loadArtifactContent}
            initialTab={initialDetailTab}
          />
        </div>
      </div>
    </>
  );
}

function TrajectoryGraph({
  experiments,
  selectedExperimentId,
  failedExperimentIds,
  criticStatusByExperimentId,
  onSelect,
}: {
  experiments: ExperimentRecord[];
  selectedExperimentId: string | undefined;
  failedExperimentIds: Set<string>;
  criticStatusByExperimentId: Map<string, CriticStatus>;
  onSelect: ({ experimentId }: { experimentId: string }) => void;
}) {
  const layout = useMemo(() => computeLaneLayout({ experiments }), [experiments]);
  const experimentsById = useMemo(() => indexById({ experiments }), [experiments]);

  if (layout.positions.length === 0) {
    return <p className={graphStyles.empty}>No experiments yet; start a session to populate the trajectory.</p>;
  }

  const laneAreaWidth = layout.laneCount * LANE_WIDTH + LANE_AREA_PADDING * 2;
  const totalHeight = layout.positions.length * ROW_HEIGHT;

  return (
    <div className={graphStyles.container}>
      <div className={graphStyles.laneArea} style={{ width: laneAreaWidth }}>
        <svg
          className={graphStyles.laneSvg}
          width={laneAreaWidth}
          height={totalHeight}
          aria-hidden="true"
        >
          {layout.edges.map((edge) => (
            <path
              className={graphStyles.lanePipe}
              d={pathFor({ edge })}
              key={`${edge.fromId}->${edge.toId}`}
              strokeWidth={LANE_STROKE_WIDTH}
            />
          ))}
          {layout.positions.map((position) => {
            const experiment = experimentsById.get(position.experimentId);
            if (!experiment) return null;
            const criticStatus = criticStatusByExperimentId.get(experiment.id) ?? "pending";
            const tone = dotTone({
              experiment,
              criticStatus,
              isFailed: failedExperimentIds.has(experiment.id),
            });
            return (
              <circle
                className={graphStyles.laneDot}
                cx={LANE_AREA_PADDING + position.lane * LANE_WIDTH + LANE_WIDTH / 2}
                cy={position.row * ROW_HEIGHT + ROW_HEIGHT / 2}
                data-tone={tone}
                key={position.experimentId}
                r={LANE_DOT_RADIUS}
              />
            );
          })}
        </svg>
      </div>
      <ol className={graphStyles.rowsColumn} style={{ height: totalHeight }}>
        {layout.positions.map((position) => {
          const experiment = experimentsById.get(position.experimentId);
          if (!experiment) return null;
          return (
            <li className={graphStyles.rowSlot} key={position.experimentId}>
              <TrajectoryNode
                experiment={experiment}
                criticStatus={criticStatusByExperimentId.get(experiment.id) ?? "pending"}
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

function TrajectoryDetailPanel({
  experimentId,
  detail,
  loadArtifactContent,
  initialTab,
}: {
  experimentId: string | undefined;
  detail: TrajectoryDetailViewData | undefined;
  loadArtifactContent: LoadArtifactContent | undefined;
  initialTab: "overview" | "diff";
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "diff">(initialTab);

  if (!experimentId) {
    return (
      <aside className={detailStyles.panel}>
        <p className={detailStyles.placeholder}>Select an experiment to see its evidence and activity.</p>
      </aside>
    );
  }

  if (!detail?.experiment) {
    return (
      <aside className={detailStyles.panel}>
        <DxEmptyState
          heading="Experiment not found"
          description={`No experiment with id ${experimentId}.`}
        />
      </aside>
    );
  }

  return (
    <aside className={detailStyles.panel}>
      <Header detail={detail} />
      <div className={detailStyles.tabBar} role="tablist">
        <button
          aria-selected={activeTab === "overview"}
          className={detailStyles.tabButton}
          data-active={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
          role="tab"
          type="button"
        >
          Overview
        </button>
        <button
          aria-selected={activeTab === "diff"}
          className={detailStyles.tabButton}
          data-active={activeTab === "diff"}
          onClick={() => setActiveTab("diff")}
          role="tab"
          type="button"
        >
          Diff
        </button>
      </div>
      {activeTab === "overview" ? (
        <div className={detailStyles.sectionsGrid}>
          <div className={detailStyles.sectionsColumn}>
            <LinkedItems title="Linked Hypotheses" items={detail.linkedHypotheses} emptyLabel="No linked hypotheses" />
            <Artifacts artifacts={detail.artifacts} />
          </div>
          <div className={detailStyles.sectionsColumn}>
            <EvaluationActivityListView
              title="Evidence"
              rows={detail.evidenceRows}
              emptyLabel="No evaluations attached"
            />
            <ActivityTimeline
              title="Activity"
              activities={detail.activities}
              emptyLabel="No experiment activity yet"
            />
          </div>
        </div>
      ) : (
        <TrajectoryDiffPane
          patchArtifact={patchArtifactFor({ artifacts: detail.artifacts })}
          loadArtifactContent={loadArtifactContent}
        />
      )}
    </aside>
  );
}

function Header({ detail }: { detail: TrajectoryDetailViewData }) {
  const { experiment } = detail;
  if (!experiment) return null;

  return (
    <header className={detailStyles.header}>
      <div className={detailStyles.headerMain}>
        <p className={detailStyles.eyebrow}>{experiment.id}</p>
        <h2 className={detailStyles.titleEl}>
          <MarkdownText value={experiment.title} variant="inline" />
        </h2>
        {experiment.summary && (
          <MarkdownText value={experiment.summary} className={detailStyles.summary} />
        )}
      </div>
      <div className={detailStyles.headerSide}>
        <DxBadge tone={statusTone({ status: experiment.status })}>{experiment.status}</DxBadge>
        <TrajectoryMeta experiment={experiment} parent={detail.parent} />
      </div>
    </header>
  );
}

function TrajectoryMeta({
  experiment,
  parent,
}: {
  experiment: ExperimentRecord;
  parent: ReactNode | undefined;
}) {
  const items: Array<{ key: string; label: string; node: ReactNode }> = [];
  if (parent) items.push({ key: "parent", label: "parent", node: parent });
  if (experiment.research_thread) {
    items.push({
      key: "thread",
      label: "thread",
      node: <span className={detailStyles.trajectoryMetaValue}>{experiment.research_thread}</span>,
    });
  }
  if (experiment.base_commit) {
    items.push({
      key: "base",
      label: "base",
      node: <span className={detailStyles.trajectoryMetaValue}>{shortSha(experiment.base_commit)}</span>,
    });
  }
  if (experiment.candidate_commit) {
    items.push({
      key: "candidate",
      label: "candidate",
      node: <span className={detailStyles.trajectoryMetaValue}>{shortSha(experiment.candidate_commit)}</span>,
    });
  }
  if (items.length === 0) return null;

  return (
    <div className={detailStyles.trajectoryMeta}>
      {items.map((item) => (
        <span className={detailStyles.trajectoryMetaRow} key={item.key}>
          <span className={detailStyles.trajectoryMetaLabel}>{item.label}</span>
          {item.node}
        </span>
      ))}
    </div>
  );
}

function LinkedItems({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: TrajectoryLinkedItem[];
  emptyLabel: string;
}) {
  return (
    <DxSection title={title}>
      {items.length === 0 && <p className={detailStyles.muted}>{emptyLabel}</p>}
      {items.length > 0 && (
        <ol className={detailStyles.linkedItemList}>
          {items.map((item) => (
            <li className={detailStyles.linkedItem} key={item.id}>
              <span className={detailStyles.linkedItemId}>{item.id}</span>
              <span className={detailStyles.linkedItemBody}>
                <MarkdownText
                  value={item.title}
                  variant="inline"
                  className={detailStyles.linkedItemTitle}
                />
                {item.summary && (
                  <MarkdownText
                    value={item.summary}
                    variant="inline"
                    className={detailStyles.linkedItemSummary}
                  />
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </DxSection>
  );
}

function Artifacts({ artifacts }: { artifacts: TrajectoryDetailViewData["artifacts"] }) {
  return (
    <DxSection title="Artifacts">
      {artifacts.length === 0 && <p className={detailStyles.muted}>No artifacts</p>}
      {artifacts.length > 0 && (
        <ol className={detailStyles.linkedItemList}>
          {artifacts.map((artifact) => (
            <li className={detailStyles.linkedItem} key={artifact.id}>
              <span className={detailStyles.linkedItemId}>{artifact.id}</span>
              <span className={detailStyles.linkedItemBody}>
                <MarkdownText
                  value={artifact.title}
                  variant="inline"
                  className={detailStyles.linkedItemTitle}
                />
                <span className={mono}>{artifact.path}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </DxSection>
  );
}

function patchArtifactFor({
  artifacts,
}: {
  artifacts: TrajectoryDetailViewData["artifacts"];
}): PatchArtifact | undefined {
  return [...artifacts].reverse().find((artifact) => artifact.kind === "patch");
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

  if (edge.fromLane === edge.toLane) return `M ${fromX} ${fromY} L ${toX} ${toY}`;
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
  if (criticStatus === "reviewed" && experiment.status === "done") return "success";
  return "neutral";
}

function indexById({ experiments }: { experiments: ExperimentRecord[] }): Map<string, ExperimentRecord> {
  const map = new Map<string, ExperimentRecord>();
  for (const e of experiments) map.set(e.id, e);
  return map;
}

function statusTone({ status }: { status: ExperimentRecord["status"] }): DxBadgeTone {
  if (status === "failed") return "danger";
  if (status === "done") return "success";
  if (status === "active") return "warning";
  return "neutral";
}

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

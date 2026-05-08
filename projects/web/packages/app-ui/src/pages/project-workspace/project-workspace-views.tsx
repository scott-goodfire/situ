import type {
  AgentRecord,
  AnalysisRecord,
  EventRecord,
  EvaluationRecord,
  ExperimentRecord,
  HypothesisRecord,
  TaskRecord,
} from "@situ/protocol";
import {
  DxBadge,
  DxEmptyState,
  DxSection,
  DxTable,
  DxTime,
  mono,
  type DxBadgeTone,
  type DxTableColumn,
  type DxTableRowTone,
} from "@situ/web-ui";
import type { ReactNode } from "react";
import { AgentPresence, AgentTranscript, type AgentTranscriptItemView } from "../../shared/agent";
import { ActivityTimeline, type ActivityTimelineItem } from "../../shared/activity-timeline";
import {
  EvaluationActivityListView,
  EvidenceSummaryView,
  type EvaluationActivityListRow,
  type EvidenceSummaryModel,
} from "../../shared/evidence";
import { MarkdownText } from "../../shared/markdown-text";
import {
  AgentStatusBadge,
  ArtifactsTable,
  DependencyList,
  LinkedRecordsTable,
  ObjectHeader,
  RecordCell,
  eventRowTone,
  prioritySortValue,
  priorityTone,
  researchStatusTone,
  taskRowTone,
  taskStatusSortValue,
  taskStatusTone,
  type ArtifactView,
  type LinkedRecordView,
} from "./project-workspace-helpers";
import * as s from "../../styles.css";

export type { ArtifactView, LinkedRecordView } from "./project-workspace-helpers";

export type AnalysisListRowView = {
  analysis: AnalysisRecord;
  title: ReactNode;
};

export function AnalysesPageView({ rows }: { rows: AnalysisListRowView[] }) {
  return (
    <DxSection title="Analyses">
      <DxTable
        columns={analysisColumns}
        rows={rows}
        getRowKey={({ row }) => row.analysis.id}
        emptyLabel="No analyses yet"
        density="compact"
        stickyHeader
        sortable
      />
    </DxSection>
  );
}

const analysisColumns: Array<DxTableColumn<AnalysisListRowView>> = [
  {
    id: "analysis",
    header: "Analysis",
    width: "32%",
    renderCell: ({ row }) => <RecordCell title={row.title} id={row.analysis.id} />,
    sortValue: ({ row }) => row.analysis.title,
  },
  {
    id: "status",
    header: "Status",
    width: "110px",
    renderCell: ({ row }) => (
      <DxBadge tone={researchStatusTone({ status: row.analysis.status })}>
        {row.analysis.status}
      </DxBadge>
    ),
    sortValue: ({ row }) => row.analysis.status,
  },
  {
    id: "summary",
    header: "Summary",
    renderCell: ({ row }) => (
      <MarkdownText value={row.analysis.summary} variant="inline" className={s.cellMuted} />
    ),
  },
];

export type HypothesisListRowView = {
  hypothesis: HypothesisRecord;
  title: ReactNode;
  experimentCount: number;
  latestActivity: ReactNode;
  evidence: EvidenceSummaryModel;
};

export function HypothesesPageView({ rows }: { rows: HypothesisListRowView[] }) {
  return (
    <DxSection title="Hypotheses">
      <DxTable
        columns={hypothesisColumns}
        rows={rows}
        getRowKey={({ row }) => row.hypothesis.id}
        emptyLabel="No hypotheses yet"
        density="compact"
        stickyHeader
        sortable
      />
    </DxSection>
  );
}

const hypothesisColumns: Array<DxTableColumn<HypothesisListRowView>> = [
  {
    id: "hypothesis",
    header: "Hypothesis",
    width: "30%",
    renderCell: ({ row }) => <RecordCell title={row.title} id={row.hypothesis.id} />,
    sortValue: ({ row }) => row.hypothesis.title,
  },
  {
    id: "status",
    header: "Status",
    width: "120px",
    renderCell: ({ row }) => (
      <DxBadge tone={researchStatusTone({ status: row.hypothesis.status })}>
        {row.hypothesis.status}
      </DxBadge>
    ),
    sortValue: ({ row }) => row.hypothesis.status,
  },
  {
    id: "experiments",
    header: "Experiments",
    width: "120px",
    renderCell: ({ row }) => <span className={mono}>{row.experimentCount}</span>,
    sortValue: ({ row }) => row.experimentCount,
  },
  {
    id: "evidence",
    header: "Evidence",
    width: "260px",
    renderCell: ({ row }) => <EvidenceSummaryView evidence={row.evidence} />,
  },
  {
    id: "latest",
    header: "Latest Activity",
    renderCell: ({ row }) => <MarkdownText value={row.latestActivity} variant="inline" />,
  },
];

export type ExperimentListRowView = {
  experiment: ExperimentRecord;
  title: ReactNode;
  hypothesisCount: number;
  evidence: EvidenceSummaryModel;
};

export function ExperimentsPageView({ rows }: { rows: ExperimentListRowView[] }) {
  return (
    <DxSection title="Experiments">
      <DxTable
        columns={experimentColumns}
        rows={rows}
        getRowKey={({ row }) => row.experiment.id}
        emptyLabel="No experiments yet"
        density="compact"
        stickyHeader
        sortable
        getRowTone={() => "neutral"}
      />
    </DxSection>
  );
}

const experimentColumns: Array<DxTableColumn<ExperimentListRowView>> = [
  {
    id: "experiment",
    header: "Experiment",
    width: "30%",
    renderCell: ({ row }) => <RecordCell title={row.title} id={row.experiment.id} />,
    sortValue: ({ row }) => row.experiment.title,
  },
  {
    id: "status",
    header: "Status",
    width: "120px",
    renderCell: ({ row }) => (
      <DxBadge tone={researchStatusTone({ status: row.experiment.status })}>
        {row.experiment.status}
      </DxBadge>
    ),
    sortValue: ({ row }) => row.experiment.status,
  },
  {
    id: "hypotheses",
    header: "Hypotheses",
    width: "120px",
    renderCell: ({ row }) => <span className={mono}>{row.hypothesisCount}</span>,
    sortValue: ({ row }) => row.hypothesisCount,
  },
  {
    id: "evidence",
    header: "Evidence",
    width: "260px",
    renderCell: ({ row }) => <EvidenceSummaryView evidence={row.evidence} />,
  },
];

export type EvaluationListRowView = {
  evaluation: EvaluationRecord;
  title: ReactNode;
  statusLabel: ReactNode;
  statusSort: string;
  statusTone: DxBadgeTone;
  source: ReactNode;
  sourceSort: string;
  openAction: ReactNode;
  rowTone: DxTableRowTone;
};

export function EvaluationsPageView({ rows }: { rows: EvaluationListRowView[] }) {
  return (
    <DxSection title="Evaluations">
      <DxTable
        columns={evaluationColumns}
        rows={rows}
        getRowKey={({ row }) => row.evaluation.id}
        emptyLabel="No evaluations yet"
        density="compact"
        stickyHeader
        sortable
        getRowTone={({ row }) => row.rowTone}
      />
    </DxSection>
  );
}

const evaluationColumns: Array<DxTableColumn<EvaluationListRowView>> = [
  {
    id: "evaluation",
    header: "Evaluation",
    width: "28%",
    renderCell: ({ row }) => <RecordCell title={row.title} id={row.evaluation.id} />,
    sortValue: ({ row }) => row.evaluation.title,
  },
  {
    id: "status",
    header: "Status",
    width: "130px",
    renderCell: ({ row }) => <DxBadge tone={row.statusTone}>{row.statusLabel}</DxBadge>,
    sortValue: ({ row }) => row.statusSort,
  },
  {
    id: "source",
    header: "Source",
    width: "240px",
    renderCell: ({ row }) => row.source,
    sortValue: ({ row }) => row.sourceSort,
  },
  {
    id: "updated",
    header: "Updated",
    width: "190px",
    renderCell: ({ row }) => <DxTime iso={row.evaluation.updated_at} className={mono} />,
    sortValue: ({ row }) => row.evaluation.updated_at,
  },
  {
    id: "open",
    header: "",
    width: "82px",
    renderCell: ({ row }) => row.openAction,
  },
];

export type TaskListRowView = {
  task: TaskRecord;
  title: ReactNode;
  assignee: ReactNode;
};

export function TasksPageView({ rows }: { rows: TaskListRowView[] }) {
  return (
    <DxSection title="Tasks">
      <DxTable
        columns={taskColumns}
        rows={rows}
        getRowKey={({ row }) => row.task.id}
        emptyLabel="No tasks yet"
        density="compact"
        stickyHeader
        sortable
        getRowTone={({ row }) => taskRowTone({ status: row.task.status })}
      />
    </DxSection>
  );
}

const taskColumns: Array<DxTableColumn<TaskListRowView>> = [
  {
    id: "task",
    header: "Task",
    width: "32%",
    renderCell: ({ row }) => <RecordCell title={row.title} id={row.task.id} />,
    sortValue: ({ row }) => row.task.title,
  },
  {
    id: "kind",
    header: "Kind",
    width: "120px",
    renderCell: ({ row }) => <DxBadge>{row.task.kind}</DxBadge>,
    sortValue: ({ row }) => row.task.kind,
  },
  {
    id: "status",
    header: "Status",
    width: "130px",
    renderCell: ({ row }) => (
      <DxBadge tone={taskStatusTone({ status: row.task.status })}>
        {row.task.status.replace(/_/g, " ")}
      </DxBadge>
    ),
    sortValue: ({ row }) => taskStatusSortValue({ status: row.task.status }),
  },
  {
    id: "priority",
    header: "Priority",
    width: "100px",
    renderCell: ({ row }) => (
      <DxBadge tone={priorityTone({ priority: row.task.priority })}>{row.task.priority}</DxBadge>
    ),
    sortValue: ({ row }) => prioritySortValue({ priority: row.task.priority }),
  },
  {
    id: "assignee",
    header: "Assignee",
    width: "150px",
    renderCell: ({ row }) => row.assignee,
    sortValue: ({ row }) => row.task.assignee_id ?? "",
  },
  {
    id: "source",
    header: "Source",
    width: "100px",
    renderCell: ({ row }) => <span>{row.task.source_kind}</span>,
    sortValue: ({ row }) => row.task.source_kind,
  },
];

export type AgentListRowView = {
  agent: AgentRecord;
  title: ReactNode;
};

export function AgentsPageView({ rows }: { rows: AgentListRowView[] }) {
  return (
    <DxSection title="Agents">
      <DxTable
        columns={agentColumns}
        rows={rows}
        getRowKey={({ row }) => row.agent.id}
        emptyLabel="No agents yet"
        density="compact"
        stickyHeader
        sortable
      />
    </DxSection>
  );
}

const agentColumns: Array<DxTableColumn<AgentListRowView>> = [
  {
    id: "agent",
    header: "Agent",
    width: "30%",
    renderCell: ({ row }) => <RecordCell title={row.title} id={row.agent.id} />,
    sortValue: ({ row }) => row.agent.display_name,
  },
  {
    id: "kind",
    header: "Kind",
    width: "120px",
    renderCell: ({ row }) => <DxBadge>{row.agent.kind}</DxBadge>,
    sortValue: ({ row }) => row.agent.kind,
  },
  {
    id: "status",
    header: "Status",
    width: "110px",
    renderCell: ({ row }) => <AgentStatusBadge status={row.agent.status} />,
    sortValue: ({ row }) => row.agent.status,
  },
  {
    id: "model",
    header: "Model",
    width: "200px",
    renderCell: ({ row }) => <span className={mono}>{row.agent.model_name ?? "-"}</span>,
    sortValue: ({ row }) => row.agent.model_name ?? "",
  },
  {
    id: "updated",
    header: "Updated",
    renderCell: ({ row }) =>
      row.agent.updated_at ? <DxTime iso={row.agent.updated_at} /> : "never",
    sortValue: ({ row }) => row.agent.updated_at,
  },
];

export function EventsPageView({ events }: { events: EventRecord[] }) {
  return (
    <DxSection title="Events">
      <DxTable
        columns={eventColumns}
        rows={events}
        getRowKey={({ row }) => String(row.id)}
        emptyLabel="No events yet"
        density="compact"
        stickyHeader
        sortable
        maxHeight="640px"
        getRowTone={eventRowTone}
      />
    </DxSection>
  );
}

const eventColumns: Array<DxTableColumn<EventRecord>> = [
  {
    id: "id",
    header: "Event",
    width: "90px",
    renderCell: ({ row }) => <span className={mono}>#{row.id}</span>,
    sortValue: ({ row }) => row.id,
  },
  {
    id: "type",
    header: "Type",
    width: "220px",
    renderCell: ({ row }) => row.type,
    sortValue: ({ row }) => row.type,
  },
  {
    id: "message",
    header: "Message",
    renderCell: ({ row }) => <MarkdownText value={row.message} variant="inline" />,
  },
  {
    id: "created",
    header: "Created",
    width: "190px",
    renderCell: ({ row }) => <DxTime iso={row.created_at} className={mono} />,
    sortValue: ({ row }) => row.created_at,
  },
];

export function AnalysisDetailView({
  analysis,
  activities,
}: {
  analysis: AnalysisRecord | undefined;
  activities: ActivityTimelineItem[];
}) {
  if (!analysis) {
    return <DxEmptyState heading="Analysis not found" description="No analysis exists with this id." />;
  }

  return (
    <>
      <ObjectHeader
        eyebrow={analysis.id}
        title={analysis.title}
        status={<DxBadge tone={researchStatusTone({ status: analysis.status })}>{analysis.status}</DxBadge>}
        summary={analysis.summary}
      />
      {analysis.content && (
        <DxSection title="Content">
          <MarkdownText value={analysis.content} className={s.objectPageSummary} />
        </DxSection>
      )}
      <ActivityTimeline
        title="Activity"
        activities={activities}
        emptyLabel="No analysis activity yet"
      />
    </>
  );
}

export function HypothesisDetailView({
  hypothesis,
  linkedExperiments,
  activities,
}: {
  hypothesis: HypothesisRecord | undefined;
  linkedExperiments: LinkedRecordView[];
  activities: ActivityTimelineItem[];
}) {
  if (!hypothesis) {
    return <DxEmptyState heading="Hypothesis not found" description="No hypothesis exists with this id." />;
  }

  return (
    <>
      <ObjectHeader
        eyebrow={hypothesis.id}
        title={hypothesis.title}
        status={<DxBadge tone={researchStatusTone({ status: hypothesis.status })}>{hypothesis.status}</DxBadge>}
        summary={hypothesis.summary}
      />
      <LinkedRecordsTable title="Linked Experiments" rows={linkedExperiments} emptyLabel="No linked experiments yet" />
      <ActivityTimeline
        title="Activity"
        activities={activities}
        emptyLabel="No hypothesis activity yet"
      />
    </>
  );
}

export function ExperimentDetailView({
  experiment,
  linkedHypotheses,
  evidenceRows,
  artifacts,
  activities,
}: {
  experiment: ExperimentRecord | undefined;
  linkedHypotheses: LinkedRecordView[];
  evidenceRows: EvaluationActivityListRow[];
  artifacts: ArtifactView[];
  activities: ActivityTimelineItem[];
}) {
  if (!experiment) {
    return <DxEmptyState heading="Experiment not found" description="No experiment exists with this id." />;
  }

  return (
    <>
      <ObjectHeader
        eyebrow={experiment.id}
        title={experiment.title}
        status={<DxBadge tone={researchStatusTone({ status: experiment.status })}>{experiment.status}</DxBadge>}
        summary={experiment.summary}
      />
      <LinkedRecordsTable title="Linked Hypotheses" rows={linkedHypotheses} emptyLabel="No linked hypotheses yet" />
      <EvaluationActivityListView
        title="Evidence"
        rows={evidenceRows}
        emptyLabel="No evaluations attached to this experiment yet"
      />
      <ArtifactsTable artifacts={artifacts} />
      <ActivityTimeline
        title="Activity"
        activities={activities}
        emptyLabel="No experiment activity yet"
      />
    </>
  );
}

export function EvaluationDetailView({
  evaluation,
  source,
  artifacts,
  activities,
}: {
  evaluation: EvaluationRecord | undefined;
  source: ReactNode;
  artifacts: ArtifactView[];
  activities: ActivityTimelineItem[];
}) {
  if (!evaluation) {
    return <DxEmptyState heading="Evaluation not found" description="No evaluation exists with this id." />;
  }

  return (
    <>
      <ObjectHeader
        eyebrow={evaluation.id}
        title={evaluation.title}
        status={<DxBadge tone={researchStatusTone({ status: evaluation.status })}>{evaluation.status}</DxBadge>}
        summary={activities.at(0)?.body ?? evaluation.summary}
      />
      <DxSection title="Source">
        {source}
      </DxSection>
      <ArtifactsTable artifacts={artifacts} />
      <ActivityTimeline
        title="Evidence"
        activities={activities}
        emptyLabel="No evaluation evidence yet"
      />
    </>
  );
}

export function TaskDetailView({
  task,
  assignee,
  blockedBy,
  blocks,
  links,
  activities,
}: {
  task: TaskRecord | undefined;
  assignee?: ReactNode;
  blockedBy: ReactNode[];
  blocks: ReactNode[];
  links: Array<{ id: string; relationship: ReactNode; target: ReactNode }>;
  activities: ActivityTimelineItem[];
}) {
  if (!task) {
    return <DxEmptyState heading="Task not found" description="No task exists with this id." />;
  }

  return (
    <>
      <ObjectHeader
        eyebrow={`${task.kind} / ${task.id}`}
        title={task.title}
        status={<DxBadge>{task.status.replace(/_/g, " ")}</DxBadge>}
        summary={task.content}
        badges={
          <>
            <DxBadge>{task.priority}</DxBadge>
            <DxBadge>{task.source_kind}</DxBadge>
            {assignee && <DxBadge>assignee: {assignee}</DxBadge>}
          </>
        }
      />

      {(blockedBy.length > 0 || blocks.length > 0) && (
        <DxSection title="Dependencies">
          {blockedBy.length > 0 && <DependencyList label="Blocked by" items={blockedBy} />}
          {blocks.length > 0 && <DependencyList label="Blocks" items={blocks} />}
        </DxSection>
      )}

      {links.length > 0 && (
        <DxSection title="Linked entities">
          {links.map((link) => (
            <div className={s.recordCell} key={link.id}>
              <span>{link.relationship}</span>
              <span className={s.recordId}>{link.target}</span>
            </div>
          ))}
        </DxSection>
      )}

      <ActivityTimeline
        title="Activity"
        activities={activities}
        emptyLabel="No task activity yet"
      />
    </>
  );
}

export function AgentDetailView({
  agent,
  presenceDetail,
  transcriptItems,
}: {
  agent: AgentRecord | undefined;
  presenceDetail: string;
  transcriptItems: AgentTranscriptItemView[];
}) {
  if (!agent) {
    return <DxEmptyState heading="Agent not found" description="No agent exists with this id." />;
  }

  return (
    <>
      <ObjectHeader
        eyebrow={`${agent.kind} / ${agent.id}`}
        title={agent.display_name}
        status={<DxBadge tone={agent.status === "active" ? "success" : "neutral"}>{agent.status}</DxBadge>}
        summary={agent.model_name ? `Model: ${agent.model_name}` : undefined}
      />
      <AgentPresence agentIds={[agent.id]} detail={presenceDetail} />
      <AgentTranscript items={transcriptItems} />
    </>
  );
}

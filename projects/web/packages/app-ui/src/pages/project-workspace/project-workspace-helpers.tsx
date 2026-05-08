import type {
  AgentRecord,
  AnalysisRecord,
  ArtifactRecord,
  EventRecord,
  EvaluationRecord,
  ExperimentRecord,
  HypothesisRecord,
  TaskRecord,
} from "@situ/protocol";
import {
  DxBadge,
  DxSection,
  DxTable,
  mono,
  type DxBadgeTone,
  type DxTableColumn,
  type DxTableRowTone,
} from "@situ/web-ui";
import type { ReactNode } from "react";
import {
  EvidenceSummaryView,
  type EvidenceSummaryModel,
} from "../../shared/evidence";
import { MarkdownText } from "../../shared/markdown-text";
import * as s from "../../styles.css";

export type LinkedRecordView = {
  id: string;
  title: ReactNode;
  titleSort: string;
  status?: ReactNode;
  summary?: ReactNode;
  evidence?: EvidenceSummaryModel;
};

export type ArtifactView = Pick<ArtifactRecord, "id" | "title" | "kind" | "path">;

export function ObjectHeader({
  eyebrow,
  title,
  status,
  summary,
  badges,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  status: ReactNode;
  summary?: ReactNode;
  badges?: ReactNode;
}) {
  return (
    <section className={s.objectPage}>
      <div className={s.objectPageHeader}>
        <div>
          <p className={s.objectPageEyebrow}>{eyebrow}</p>
          <h2>
            <MarkdownText value={title} variant="inline" />
          </h2>
        </div>
        {status}
      </div>
      {summary && <MarkdownText value={summary} className={s.objectPageSummary} />}
      {badges && <div className={s.objectPageBadgeRow}>{badges}</div>}
    </section>
  );
}

export function LinkedRecordsTable({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: LinkedRecordView[];
  emptyLabel: string;
}) {
  return (
    <DxSection title={title}>
      <DxTable
        columns={linkedRecordColumns}
        rows={rows}
        getRowKey={({ row }) => row.id}
        emptyLabel={emptyLabel}
        density="compact"
        stickyHeader
      />
    </DxSection>
  );
}

const linkedRecordColumns: Array<DxTableColumn<LinkedRecordView>> = [
  {
    id: "record",
    header: "Record",
    width: "34%",
    renderCell: ({ row }) => <RecordCell title={row.title} id={row.id} />,
    sortValue: ({ row }) => row.titleSort,
  },
  {
    id: "status",
    header: "Status",
    width: "120px",
    renderCell: ({ row }) => row.status ?? "-",
  },
  {
    id: "summary",
    header: "Summary",
    renderCell: ({ row }) =>
      row.summary ? <MarkdownText value={row.summary} variant="inline" /> : "-",
  },
  {
    id: "evidence",
    header: "Evidence",
    width: "260px",
    renderCell: ({ row }) =>
      row.evidence ? <EvidenceSummaryView evidence={row.evidence} /> : null,
  },
];

export function ArtifactsTable({ artifacts }: { artifacts: ArtifactView[] }) {
  const rows = artifacts.map((artifact) => ({ artifact }));

  return (
    <DxSection title="Artifacts">
      <DxTable
        columns={artifactColumns}
        rows={rows}
        getRowKey={({ row }) => row.artifact.id}
        emptyLabel="No artifacts yet"
        density="compact"
        stickyHeader
      />
    </DxSection>
  );
}

const artifactColumns: Array<DxTableColumn<{ artifact: ArtifactView }>> = [
  {
    id: "artifact",
    header: "Artifact",
    width: "30%",
    renderCell: ({ row }) => (
      <RecordCell title={row.artifact.title} id={row.artifact.id} />
    ),
  },
  {
    id: "kind",
    header: "Kind",
    width: "120px",
    renderCell: ({ row }) => row.artifact.kind,
  },
  {
    id: "path",
    header: "Path",
    renderCell: ({ row }) => <span className={mono}>{row.artifact.path}</span>,
  },
];

export function DependencyList({ label, items }: { label: string; items: ReactNode[] }) {
  return (
    <div className={s.dependencyList}>
      <strong>{label}</strong>
      {items.map((item, index) => (
        <span key={index}>{item}</span>
      ))}
    </div>
  );
}

export function RecordCell({ title, id }: { title: ReactNode; id: ReactNode }) {
  return (
    <div className={s.recordCell}>
      <MarkdownText value={title} variant="inline" />
      <span className={s.recordId}>{id}</span>
    </div>
  );
}

export function AgentStatusBadge({ status }: { status: AgentRecord["status"] }) {
  if (status === "active") {
    return (
      <DxBadge tone="success" withDot>
        active
      </DxBadge>
    );
  }
  if (status === "idle") return <DxBadge>idle</DxBadge>;
  return <DxBadge tone="neutral">closed</DxBadge>;
}

export function researchStatusTone({
  status,
}: {
  status:
    | AnalysisRecord["status"]
    | HypothesisRecord["status"]
    | ExperimentRecord["status"]
    | EvaluationRecord["status"];
}): DxBadgeTone {
  if (status === "failed") return "danger";
  if (status === "done") return "success";
  if (status === "active") return "warning";
  return "neutral";
}

export function taskStatusTone({ status }: { status: TaskRecord["status"] }): DxBadgeTone {
  if (status === "in_progress") return "warning";
  if (status === "done") return "success";
  if (status === "failed") return "danger";
  return "neutral";
}

export function taskStatusSortValue({
  status,
}: {
  status: TaskRecord["status"];
}): number {
  if (status === "in_progress") return 0;
  if (status === "triage") return 1;
  if (status === "backlog") return 2;
  if (status === "done") return 3;
  if (status === "canceled") return 4;
  return 5;
}

export function priorityTone({
  priority,
}: {
  priority: TaskRecord["priority"];
}): DxBadgeTone {
  if (priority === "urgent") return "danger";
  if (priority === "high") return "warning";
  return "neutral";
}

export function prioritySortValue({
  priority,
}: {
  priority: TaskRecord["priority"];
}): number {
  if (priority === "urgent") return 0;
  if (priority === "high") return 1;
  if (priority === "normal") return 2;
  return 3;
}

export function taskRowTone({ status }: { status: TaskRecord["status"] }): DxTableRowTone {
  if (status === "failed") return "danger";
  if (status === "in_progress") return "warning";
  return "neutral";
}

export function eventRowTone({ row: event }: { row: EventRecord }): DxTableRowTone {
  const searchableText = `${event.type} ${event.message}`.toLowerCase();
  if (searchableText.includes("failed") || searchableText.includes("error")) {
    return "danger";
  }
  if (searchableText.includes("suspicious")) return "warning";
  return "neutral";
}

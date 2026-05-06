import lodash from "lodash";
import { Text } from "ink";
import type {
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisActivityRecord,
  HypothesisRecord,
  ObjectiveRecord,
  ResearchContextRecord,
  SessionRecord,
} from "@situ/protocol";
import {
  DashboardControls,
  type DashboardCommand,
  type DashboardControlMessage,
} from "../dashboard-controls/dashboard-controls.js";
import { LayoutBox } from "../layout-box/layout-box.js";
import { PaneSection } from "../pane-section/pane-section.js";
import { previewText } from "../text-preview/text-preview.js";
import {
  MIN_DASHBOARD_HEIGHT,
  MIN_DASHBOARD_WIDTH,
  computeDashboardLayout,
} from "./dashboard-layout.js";
import {
  DashboardFrame,
  DashboardFrameFooter,
  DashboardFrameSection,
} from "./dashboard-frame.js";
import { useTerminalSize, type TerminalSize } from "./use-terminal-size.js";

export type DashboardTaskStatus = "todo" | "in-progress" | "done";
export type DashboardTaskKind =
  | "experiment"
  | "hypothesis"
  | "evaluation"
  | "concern";
export type DashboardTaskTone = "default" | "warning" | "success";

export type DashboardTask = {
  id: string;
  title: string;
  status: DashboardTaskStatus;
  kind: DashboardTaskKind;
  tone?: DashboardTaskTone;
};

export function FullscreenDashboard({
  workspace,
  statusLine,
  dashboardMessage,
  objective,
  researchContext,
  session,
  experimentCount,
  maxExperiments,
  hypotheses,
  experiments,
  evaluations,
  hypothesisActivities,
  experimentActivities,
  evaluationActivities,
  onDashboardCommand,
  terminalSize,
}: {
  workspace: string;
  statusLine: string;
  dashboardMessage: DashboardControlMessage | undefined;
  objective: ObjectiveRecord | undefined;
  researchContext?: ResearchContextRecord | undefined;
  session: SessionRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  evaluations: EvaluationRecord[];
  hypothesisActivities: HypothesisActivityRecord[];
  experimentActivities: ExperimentActivityRecord[];
  evaluationActivities: EvaluationActivityRecord[];
  onDashboardCommand: ({ command }: { command: DashboardCommand }) => void;
  terminalSize?: TerminalSize;
}) {
  const detectedTerminalSize = useTerminalSize();
  const effectiveTerminalSize = terminalSize ?? detectedTerminalSize;
  const layout = computeDashboardLayout({
    columns: effectiveTerminalSize.columns,
    rows: effectiveTerminalSize.rows,
  });

  if (layout.mode === "too-small") {
    return (
      <ExpandTerminalNotice
        width={layout.width}
        height={layout.height}
        onDashboardCommand={onDashboardCommand}
      />
    );
  }

  const concerns = concernCount({
    hypothesisActivities,
    experimentActivities,
    evaluationActivities,
  });
  const tasks = buildDashboardTasks({
    hypotheses,
    experiments,
    evaluations,
    experimentActivities,
    evaluationActivities,
  });
  const activityRows = buildActivityRows({
    experiments,
    experimentActivities,
    maxRows: layout.activityRows,
    width: layout.contentWidth,
  });
  const headerLabel = dashboardHeaderLabel({
    workspace,
    session,
  });

  return (
    <DashboardFrame
      title={headerLabel}
      width={layout.width}
      height={layout.height}
      footer={
        <DashboardControls
          message={dashboardMessage}
          onCommand={onDashboardCommand}
          idleRenderer={({ label, message }) => (
            <DashboardFrameFooter
              label={footerLabel({ label, message })}
              width={layout.width}
              tone={message?.tone}
            />
          )}
        />
      }
    >
      <DashboardFrameSection width={layout.width} height={layout.headerHeight}>
        <DashboardHeader
          width={layout.contentWidth}
          workspace={workspace}
          statusLine={statusLine}
          objective={objective}
          researchContext={researchContext}
          session={session}
        />
      </DashboardFrameSection>

      <DashboardFrameSection
        label="counts"
        width={layout.width}
        height={layout.countsHeight}
      >
        <DashboardStats
          width={layout.contentWidth}
          experimentCount={experimentCount}
          maxExperiments={maxExperiments}
          hypothesisCount={hypotheses.length}
          evaluationCount={evaluations.length}
          concernCount={concerns}
        />
      </DashboardFrameSection>

      <DashboardFrameSection
        label="tasks"
        width={layout.width}
        height={layout.taskBoardHeight}
      >
        <TaskBoard
          tasks={tasks}
          height={layout.taskBoardHeight}
          columnWidths={layout.taskColumnWidths}
          maxRowsPerColumn={layout.taskRowsPerColumn}
        />
      </DashboardFrameSection>

      <DashboardFrameSection
        label="activity"
        width={layout.width}
        height={layout.activityHeight}
      >
        <ActivityFeed
          rows={activityRows}
          width={layout.contentWidth}
          height={layout.activityHeight}
        />
      </DashboardFrameSection>
    </DashboardFrame>
  );
}

function DashboardHeader({
  width,
  workspace,
  statusLine,
  objective,
  researchContext,
  session,
}: {
  width: number;
  workspace: string;
  statusLine: string;
  objective: ObjectiveRecord | undefined;
  researchContext: ResearchContextRecord | undefined;
  session: SessionRecord | undefined;
}) {
  const objectiveTitle = objective?.title ?? "No active objective";
  const contextLabel = researchContext?.body ?? "No research context";
  const sessionState = session ? `${session.status} session` : "no session";
  const sessionContext = session ? statusLine : "Waiting for a session";
  const statusContext = previewText({
    value: `${workspace} · ${sessionContext} · ${contextLabel}`,
    maxCharacters: Math.max(24, width),
  });
  const activeLine = previewText({
    value: `${sessionState} · ${objectiveTitle} · ${statusLine}`,
    maxCharacters: Math.max(24, width),
  });

  return (
    <LayoutBox width={width}>
      <Text>{activeLine}</Text>
      <Text dimColor>{statusContext}</Text>
    </LayoutBox>
  );
}

function DashboardStats({
  width,
  experimentCount,
  maxExperiments,
  hypothesisCount,
  evaluationCount,
  concernCount,
}: {
  width: number;
  experimentCount: number;
  maxExperiments: number;
  hypothesisCount: number;
  evaluationCount: number;
  concernCount: number;
}) {
  const stats = [
    `experiments ${experimentCount}/${maxExperiments}`,
    `hypotheses ${hypothesisCount}`,
    `evaluations ${evaluationCount}`,
    `concerns ${concernCount}`,
  ].join("   ");

  return (
    <LayoutBox width={width}>
      <Text>{previewText({ value: stats, maxCharacters: width })}</Text>
    </LayoutBox>
  );
}

function TaskBoard({
  tasks,
  height,
  columnWidths,
  maxRowsPerColumn,
}: {
  tasks: DashboardTask[];
  height: number;
  columnWidths: [number, number, number];
  maxRowsPerColumn: number;
}) {
  const todoTasks = tasks.filter((task) => task.status === "todo");
  const inProgressTasks = tasks.filter((task) => task.status === "in-progress");
  const doneTasks = tasks.filter((task) => task.status === "done");

  return (
    <LayoutBox direction="row" height={height}>
      <TaskColumn
        title="TODO"
        tasks={todoTasks}
        width={columnWidths[0]}
        height={height}
        maxRows={maxRowsPerColumn}
      />
      <TaskColumnDivider height={height} />
      <TaskColumn
        title="IN PROGRESS"
        tasks={inProgressTasks}
        width={columnWidths[1]}
        height={height}
        maxRows={maxRowsPerColumn}
      />
      <TaskColumnDivider height={height} />
      <TaskColumn
        title="DONE"
        tasks={doneTasks}
        width={columnWidths[2]}
        height={height}
        maxRows={maxRowsPerColumn}
      />
    </LayoutBox>
  );
}

function TaskColumn({
  title,
  tasks,
  width,
  height,
  maxRows,
}: {
  title: string;
  tasks: DashboardTask[];
  width: number;
  height: number;
  maxRows: number;
}) {
  const hiddenTaskCountAtFullHeight = Math.max(0, tasks.length - maxRows);
  const visibleLimit =
    hiddenTaskCountAtFullHeight > 0 ? Math.max(0, maxRows - 1) : maxRows;
  const visibleTasks = tasks.slice(0, visibleLimit);
  const hiddenTaskCount = Math.max(0, tasks.length - visibleTasks.length);
  const rowWidth = width;
  const bodyRowCount =
    visibleTasks.length +
    (visibleTasks.length === 0 ? 1 : 0) +
    (hiddenTaskCount > 0 ? 1 : 0);
  const blankRowCount = Math.max(0, maxRows - bodyRowCount);

  return (
    <LayoutBox width={width} height={height}>
      <Text color="cyan" bold>{fitRow({ value: title, width: rowWidth })}</Text>
      {visibleTasks.length === 0 && (
        <Text dimColor>{fitRow({ value: "No tasks", width: rowWidth })}</Text>
      )}
      {visibleTasks.map((task) => (
        <TaskRow key={task.id} task={task} width={rowWidth} />
      ))}
      {hiddenTaskCount > 0 && (
        <Text dimColor>
          {fitRow({ value: `+ ${hiddenTaskCount} more`, width: rowWidth })}
        </Text>
      )}
      {Array.from({ length: blankRowCount }, (_, index) => (
        <Text key={`blank:${index}`}>{fitRow({ value: "", width })}</Text>
      ))}
    </LayoutBox>
  );
}

function TaskColumnDivider({ height }: { height: number }) {
  return (
    <LayoutBox width={2} height={height}>
      {Array.from({ length: height }, (_, index) => (
        <Text key={index} dimColor>
          │{" "}
        </Text>
      ))}
    </LayoutBox>
  );
}

function TaskRow({ task, width }: { task: DashboardTask; width: number }) {
  const glyph = glyphForTask({ task });
  const color = colorForTask({ task });
  const row = fitRow({
    value: `${glyph} ${task.title}`,
    width,
  });

  return <Text color={color}>{row}</Text>;
}

function ActivityFeed({
  rows,
  width,
  height,
}: {
  rows: ActivityFeedRow[];
  width: number;
  height: number;
}) {
  const bodyRowCount = rows.length === 0 ? 1 : rows.length;
  const blankRowCount = Math.max(0, height - bodyRowCount);

  return (
    <LayoutBox width={width} height={height}>
      {rows.length === 0 && <Text dimColor>No experiment activity yet</Text>}
      {rows.map((row) => (
        <Text key={row.id} color={row.tone}>
          {fitActivityRow({ row, width })}
        </Text>
      ))}
      {Array.from({ length: blankRowCount }, (_, index) => (
        <Text key={`blank:${index}`}>{fitRow({ value: "", width })}</Text>
      ))}
    </LayoutBox>
  );
}

function ExpandTerminalNotice({
  width,
  height,
  onDashboardCommand,
}: {
  width: number;
  height: number;
  onDashboardCommand: ({ command }: { command: DashboardCommand }) => void;
}) {
  const noticeWidth = Math.max(44, Math.min(width, 72));

  return (
    <LayoutBox
      width={width}
      height={height}
      alignItems="center"
      justifyContent="center"
    >
      <PaneSection
        title="Please expand terminal"
        chrome="box"
        tone="warning"
        width={noticeWidth}
      >
        <Text>
          {`Situ needs at least ${MIN_DASHBOARD_WIDTH}x${MIN_DASHBOARD_HEIGHT} to render.`}
        </Text>
        <Text dimColor>Current size {width}x{height}</Text>
        <Text dimColor>Press q to quit.</Text>
        <DashboardControls
          message={undefined}
          onCommand={onDashboardCommand}
        />
      </PaneSection>
    </LayoutBox>
  );
}

function dashboardHeaderLabel({
  workspace,
  session,
}: {
  workspace: string;
  session: SessionRecord | undefined;
}): string {
  const sessionLabel = session
    ? `${session.id} ${session.status}`
    : "no session";

  return `SITU / ${workspaceName({ workspace })} / ${sessionLabel}`;
}

function workspaceName({ workspace }: { workspace: string }): string {
  const parts = workspace.split("/").filter(Boolean);

  return parts[parts.length - 1] ?? workspace;
}

function footerLabel({
  label,
  message,
}: {
  label: string;
  message: DashboardControlMessage | undefined;
}): string {
  if (!message) {
    return label;
  }

  return `${message.text} · ${label}`;
}

type ActivityFeedRow = {
  id: string;
  label: string;
  body: string;
  tone: "gray" | "cyan" | "yellow" | "red";
};

function buildDashboardTasks({
  hypotheses,
  experiments,
  evaluations,
  experimentActivities,
  evaluationActivities,
}: {
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  evaluations: EvaluationRecord[];
  experimentActivities: ExperimentActivityRecord[];
  evaluationActivities: EvaluationActivityRecord[];
}): DashboardTask[] {
  const experimentTasks = experiments.map((experiment) =>
    taskFromExperiment({ experiment, experimentActivities }),
  );
  const evaluationTasks = evaluations.map((evaluation) =>
    taskFromEvaluation({ evaluation, evaluationActivities }),
  );
  const hypothesisTasks = hypotheses
    .filter((hypothesis) => hypothesis.status !== "closed")
    .map((hypothesis) => ({
      id: `hypothesis:${hypothesis.id}`,
      title: hypothesis.title,
      status: "todo" as const,
      kind: "hypothesis" as const,
    }));

  return lodash.orderBy(
    [...experimentTasks, ...evaluationTasks, ...hypothesisTasks],
    [(task) => sortRankForTask({ task }), (task) => task.title],
    ["asc", "asc"],
  );
}

function taskFromExperiment({
  experiment,
  experimentActivities,
}: {
  experiment: ExperimentRecord;
  experimentActivities: ExperimentActivityRecord[];
}): DashboardTask {
  const tone = hasExperimentConcern({
    experimentId: experiment.id,
    experimentActivities,
  })
    ? "warning"
    : undefined;

  return {
    id: `experiment:${experiment.id}`,
    title: experiment.title,
    status: statusForRecord({ status: experiment.status }),
    kind: tone === "warning" ? "concern" : "experiment",
    tone,
  };
}

function taskFromEvaluation({
  evaluation,
  evaluationActivities,
}: {
  evaluation: EvaluationRecord;
  evaluationActivities: EvaluationActivityRecord[];
}): DashboardTask {
  const tone = hasEvaluationConcern({
    evaluationId: evaluation.id,
    evaluationActivities,
  })
    ? "warning"
    : undefined;

  return {
    id: `evaluation:${evaluation.id}`,
    title: evaluation.title,
    status: statusForRecord({ status: evaluation.status }),
    kind: tone === "warning" ? "concern" : "evaluation",
    tone,
  };
}

function statusForRecord({
  status,
}: {
  status: "open" | "active" | "closed";
}): DashboardTaskStatus {
  if (status === "active") {
    return "in-progress";
  }

  if (status === "closed") {
    return "done";
  }

  return "todo";
}

function buildActivityRows({
  experiments,
  experimentActivities,
  maxRows,
  width,
}: {
  experiments: ExperimentRecord[];
  experimentActivities: ExperimentActivityRecord[];
  maxRows: number;
  width: number;
}): ActivityFeedRow[] {
  const experimentsById = lodash.keyBy(experiments, "id");
  const sortedActivities = lodash
    .orderBy(
      experimentActivities,
      [(activity) => activity.created_at, (activity) => activity.id],
      ["asc", "asc"],
    )
    .slice(-maxRows);

  return sortedActivities.map((activity) => {
    const experiment = experimentsById[activity.experiment_id];
    const label = activityLabel({ activity });
    const body = experiment
      ? `${experiment.title}: ${activity.body}`
      : activity.body;

    return {
      id: `experiment-activity:${activity.id}`,
      label,
      body: previewText({
        value: body,
        maxCharacters: Math.max(12, width - 12),
      }),
      tone: activityTone({ activity }),
    };
  });
}

function fitActivityRow({
  row,
  width,
}: {
  row: ActivityFeedRow;
  width: number;
}): string {
  const label = row.label.padEnd(8).slice(0, 8);
  const bodyWidth = Math.max(8, width - label.length - 2);

  return `${label} ${fitRow({ value: row.body, width: bodyWidth })}`;
}

function concernCount({
  hypothesisActivities,
  experimentActivities,
  evaluationActivities,
}: {
  hypothesisActivities: HypothesisActivityRecord[];
  experimentActivities: ExperimentActivityRecord[];
  evaluationActivities: EvaluationActivityRecord[];
}): number {
  return [
    ...hypothesisActivities,
    ...experimentActivities,
    ...evaluationActivities,
  ].filter((activity) => activity.payload?.activity_type === "concern").length;
}

function hasExperimentConcern({
  experimentId,
  experimentActivities,
}: {
  experimentId: string;
  experimentActivities: ExperimentActivityRecord[];
}): boolean {
  return experimentActivities.some(
    (activity) =>
      activity.experiment_id === experimentId &&
      activity.payload?.activity_type === "concern",
  );
}

function hasEvaluationConcern({
  evaluationId,
  evaluationActivities,
}: {
  evaluationId: string;
  evaluationActivities: EvaluationActivityRecord[];
}): boolean {
  return evaluationActivities.some(
    (activity) =>
      activity.evaluation_id === evaluationId &&
      activity.payload?.activity_type === "concern",
  );
}

function activityLabel({
  activity,
}: {
  activity: ExperimentActivityRecord;
}): string {
  const activityType = activity.payload?.activity_type;

  if (activityType === "concern") {
    return "concern";
  }

  if (activityType === "result") {
    return "result";
  }

  return "update";
}

function activityTone({
  activity,
}: {
  activity: ExperimentActivityRecord;
}): "gray" | "cyan" | "yellow" | "red" {
  const activityType = activity.payload?.activity_type;

  if (activityType === "concern") {
    return "yellow";
  }

  if (activityType === "result") {
    return "cyan";
  }

  return "gray";
}

function glyphForTask({ task }: { task: DashboardTask }): string {
  if (task.tone === "warning") {
    return "!";
  }

  if (task.status === "in-progress") {
    return "●";
  }

  if (task.status === "done") {
    return "✓";
  }

  return "○";
}

function colorForTask({
  task,
}: {
  task: DashboardTask;
}): "gray" | "cyan" | "yellow" | "green" {
  if (task.tone === "warning") {
    return "yellow";
  }

  if (task.status === "in-progress") {
    return "cyan";
  }

  if (task.status === "done") {
    return "green";
  }

  return "gray";
}

function sortRankForTask({ task }: { task: DashboardTask }): number {
  if (task.status === "in-progress") {
    return 0;
  }

  if (task.status === "todo") {
    return 1;
  }

  return 2;
}

function fitRow({
  value,
  width,
}: {
  value: string;
  width: number;
}): string {
  if (width <= 0) {
    return "";
  }

  if (value.length <= width) {
    return value.padEnd(width);
  }

  if (width === 1) {
    return "…";
  }

  return `${value.slice(0, width - 1)}…`;
}

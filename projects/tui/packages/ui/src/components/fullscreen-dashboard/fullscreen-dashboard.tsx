import lodash from "lodash";
import { Text } from "ink";
import { useEffect, useState } from "react";
import type {
  AgentRecord,
  EventRecord,
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisActivityRecord,
  HypothesisRecord,
  ProjectRecord,
  SessionRecord,
  TaskActivityRecord,
  TaskRecord,
} from "@situ/protocol";
import {
  DashboardCommandPicker,
  DashboardControls,
  type DashboardCommand,
  type DashboardControlMode,
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
  | "task"
  | "experiment"
  | "hypothesis"
  | "evaluation"
  | "concern";
export type DashboardTaskTone = "default" | "warning" | "success" | "danger";
export type DashboardTaskLoaderKind = "flash" | "burst";

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
  project,
  session,
  agents,
  tasks,
  experimentCount,
  maxExperiments,
  hypotheses,
  experiments,
  evaluations,
  taskActivities,
  hypothesisActivities,
  experimentActivities,
  evaluationActivities,
  events,
  onDashboardCommand,
  initialControlMode = "idle",
  taskLoaderKind = "flash",
  terminalSize,
}: {
  workspace: string;
  statusLine: string;
  dashboardMessage: DashboardControlMessage | undefined;
  project: ProjectRecord | undefined;
  session: SessionRecord | undefined;
  agents: AgentRecord[];
  tasks: TaskRecord[];
  experimentCount: number;
  maxExperiments: number;
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  evaluations: EvaluationRecord[];
  taskActivities: TaskActivityRecord[];
  hypothesisActivities: HypothesisActivityRecord[];
  experimentActivities: ExperimentActivityRecord[];
  evaluationActivities: EvaluationActivityRecord[];
  events: EventRecord[];
  onDashboardCommand: ({ command }: { command: DashboardCommand }) => void;
  initialControlMode?: DashboardControlMode;
  taskLoaderKind?: DashboardTaskLoaderKind;
  terminalSize?: TerminalSize;
}) {
  const [controlMode, setControlMode] =
    useState<DashboardControlMode>(initialControlMode);
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
    taskActivities,
    hypothesisActivities,
    experimentActivities,
    evaluationActivities,
  });
  const dashboardTasks = buildDashboardTasks({
    tasks,
    agents,
    hypotheses,
    experiments,
    evaluations,
    experimentActivities,
    evaluationActivities,
  });
  const activityRows = buildActivityRows({
    tasks,
    hypotheses,
    experiments,
    evaluations,
    taskActivities,
    hypothesisActivities,
    experimentActivities,
    evaluationActivities,
    events,
    maxRows: layout.activityRows,
    width: layout.contentWidth,
  });
  const lastActivityLabel = lastActivitySummary({
    taskActivities,
    hypothesisActivities,
    experimentActivities,
    evaluationActivities,
    events,
  });
  const resultSparkline = sparklineForResultActivities({
    experimentActivities,
    evaluationActivities,
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
          mode={controlMode}
          onModeChange={setControlMode}
          onCommand={onDashboardCommand}
          renderCommandsInPlace
          idleRenderer={({ label, message }) => (
            <DashboardFrameFooter
              label={footerLabel({ label, message })}
              width={layout.width}
              tone={footerTone({ message })}
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
          project={project}
          session={session}
          lastActivityLabel={lastActivityLabel}
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
          resultSparkline={resultSparkline}
        />
      </DashboardFrameSection>

      <DashboardFrameSection
        label="tasks"
        width={layout.width}
        height={layout.taskBoardHeight}
      >
        <TaskBoard
          tasks={dashboardTasks}
          loaderKind={taskLoaderKind}
          height={layout.taskBoardHeight}
          columnWidths={layout.taskColumnWidths}
          maxRowsPerColumn={layout.taskRowsPerColumn}
        />
      </DashboardFrameSection>

      <DashboardFrameSection
        label={controlMode === "commands" ? "commands" : "activity"}
        width={layout.width}
        height={layout.activityHeight}
      >
        {controlMode === "commands" ? (
          <DashboardCommandPane
            width={layout.contentWidth}
            height={layout.activityHeight}
            onCancel={() => {
              setControlMode("idle");
            }}
            onCommand={({ command }) => {
              setControlMode("idle");
              onDashboardCommand({ command });
            }}
          />
        ) : (
          <ActivityFeed
            rows={activityRows}
            width={layout.contentWidth}
            height={layout.activityHeight}
          />
        )}
      </DashboardFrameSection>
    </DashboardFrame>
  );
}

function DashboardCommandPane({
  width,
  height,
  onCancel,
  onCommand,
}: {
  width: number;
  height: number;
  onCancel: () => void;
  onCommand: ({ command }: { command: DashboardCommand }) => void;
}) {
  return (
    <LayoutBox width={width} height={height}>
      <DashboardCommandPicker
        message={undefined}
        onCancel={onCancel}
        onCommand={onCommand}
        showHint={false}
      />
    </LayoutBox>
  );
}

function DashboardHeader({
  width,
  workspace,
  statusLine,
  project,
  session,
  lastActivityLabel,
}: {
  width: number;
  workspace: string;
  statusLine: string;
  project: ProjectRecord | undefined;
  session: SessionRecord | undefined;
  lastActivityLabel: string | undefined;
}) {
  const objectiveTitle = project?.objective ?? "No active objective";
  const contextLabel = project?.research_context ?? "No research context";
  const sessionState = session ? `${session.status} session` : "no session";
  const sessionContext = session ? statusLine : "Waiting for a session";
  const activitySuffix = lastActivityLabel ? ` · ${lastActivityLabel}` : "";
  const statusContext = previewText({
    value: `${workspace} · ${sessionContext} · ${contextLabel}`,
    maxCharacters: Math.max(24, width),
  });
  const activeLine = previewText({
    value: `${sessionState} · ${objectiveTitle}${activitySuffix}`,
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
  resultSparkline,
}: {
  width: number;
  experimentCount: number;
  maxExperiments: number;
  hypothesisCount: number;
  evaluationCount: number;
  concernCount: number;
  resultSparkline: string | undefined;
}) {
  const concernLabel = `concerns ${concernCount}`;
  const baseStats = [
    `experiments ${experimentCount}/${maxExperiments} ${experimentBudgetBar({
      current: experimentCount,
      total: maxExperiments,
    })}`,
    `hypotheses ${hypothesisCount}`,
    `evaluations ${evaluationCount}`,
    resultSparkline ? `trend ${resultSparkline}` : undefined,
  ].filter((stat) => stat !== undefined);
  const baseLabel = baseStats.join("   ");
  const baseWidth = Math.max(0, width - concernLabel.length - 3);
  const fittedBaseLabel = previewText({
    value: baseLabel,
    maxCharacters: baseWidth,
  });
  const fittedConcernLabel = previewText({
    value: concernLabel,
    maxCharacters: Math.max(1, width - fittedBaseLabel.length - 3),
  });
  const fittedLine = [fittedBaseLabel, fittedConcernLabel]
    .filter(Boolean)
    .join("   ");

  if (fittedLine.length > width) {
    return (
      <LayoutBox width={width}>
        <Text color={concernCount > 0 ? "yellow" : undefined}>
          {previewText({
            value: `${baseLabel}   ${concernLabel}`,
            maxCharacters: width,
          })}
        </Text>
      </LayoutBox>
    );
  }

  return (
    <LayoutBox width={width}>
      <Text>
        {fittedBaseLabel}
        {fittedBaseLabel ? "   " : ""}
        <Text
          color={concernCount > 0 ? "yellow" : undefined}
          bold={concernCount > 0}
        >
          {fittedConcernLabel}
        </Text>
      </Text>
    </LayoutBox>
  );
}

function experimentBudgetBar({
  current,
  total,
}: {
  current: number;
  total: number;
}): string {
  const barWidth = 6;

  if (total <= 0) {
    return "[------]";
  }

  const filledWidth = Math.max(
    0,
    Math.min(barWidth, Math.round((current / total) * barWidth)),
  );

  return `[${"#".repeat(filledWidth)}${"-".repeat(barWidth - filledWidth)}]`;
}

function sparklineForResultActivities({
  experimentActivities,
  evaluationActivities,
}: {
  experimentActivities: ExperimentActivityRecord[];
  evaluationActivities: EvaluationActivityRecord[];
}): string | undefined {
  const values = lodash
    .orderBy(
      [...experimentActivities, ...evaluationActivities],
      [(activity) => timestampMillis({ isoTimestamp: activity.created_at })],
      ["asc"],
    )
    .map((activity) => numericResultValue({ payload: activity.payload }))
    .filter((value) => value !== undefined)
    .slice(-8);

  if (values.length < 2) {
    return undefined;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const ticks = "▁▂▃▄▅▆▇█";

  if (min === max) {
    return ticks[0].repeat(values.length);
  }

  return values
    .map((value) => {
      const index = Math.round(((value - min) / (max - min)) * (ticks.length - 1));
      return ticks[index];
    })
    .join("");
}

function numericResultValue({
  payload,
}: {
  payload: Record<string, unknown> | undefined;
}): number | undefined {
  if (!payload || payload.activity_type !== "result") {
    return undefined;
  }

  const signals = payload.signals;
  if (Array.isArray(signals)) {
    for (const signal of signals) {
      const value = numericSignalValue({ signal });
      if (value !== undefined) {
        return value;
      }
    }
  }

  for (const key of ["score", "accuracy", "resolution_rate", "pass_rate"]) {
    const value = payload[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function numericSignalValue({ signal }: { signal: unknown }): number | undefined {
  if (!isRecord(signal)) {
    return undefined;
  }

  const key = signal.key;
  const name = signal.name;
  if (
    key !== "score" &&
    name !== "score" &&
    key !== "accuracy" &&
    name !== "accuracy" &&
    key !== "resolution_rate" &&
    name !== "resolution_rate"
  ) {
    return undefined;
  }

  const value = signal.value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function TaskBoard({
  tasks,
  loaderKind,
  height,
  columnWidths,
  maxRowsPerColumn,
}: {
  tasks: DashboardTask[];
  loaderKind: DashboardTaskLoaderKind;
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
        loaderKind={loaderKind}
        width={columnWidths[0]}
        height={height}
        maxRows={maxRowsPerColumn}
      />
      <TaskColumnDivider height={height} />
      <TaskColumn
        title="IN PROGRESS"
        tasks={inProgressTasks}
        loaderKind={loaderKind}
        width={columnWidths[1]}
        height={height}
        maxRows={maxRowsPerColumn}
      />
      <TaskColumnDivider height={height} />
      <TaskColumn
        title="DONE"
        tasks={doneTasks}
        loaderKind={loaderKind}
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
  loaderKind,
  width,
  height,
  maxRows,
}: {
  title: string;
  tasks: DashboardTask[];
  loaderKind: DashboardTaskLoaderKind;
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
      <Text color="gray" bold>{fitRow({ value: title, width: rowWidth })}</Text>
      {visibleTasks.length === 0 && (
        <Text dimColor>{fitRow({ value: "No tasks", width: rowWidth })}</Text>
      )}
      {visibleTasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          loaderKind={loaderKind}
          width={rowWidth}
        />
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

function TaskRow({
  task,
  loaderKind,
  width,
}: {
  task: DashboardTask;
  loaderKind: DashboardTaskLoaderKind;
  width: number;
}) {
  const glyph = useTaskGlyph({ task, loaderKind });
  const glyphColor = glyphColorForTask({ task });
  const markerWidth = 2;
  const titleWidth = Math.max(0, width - markerWidth - 1);

  if (width <= markerWidth) {
    return <Text color={glyphColor}>{fitRow({ value: glyph, width })}</Text>;
  }

  return (
    <Text>
      <Text color={glyphColor}>{glyph}</Text>
      {markerPadding({ glyph, markerWidth })}{" "}
      {fitRow({ value: task.title, width: titleWidth })}
    </Text>
  );
}

function markerPadding({
  glyph,
  markerWidth,
}: {
  glyph: string;
  markerWidth: number;
}): string {
  return " ".repeat(Math.max(0, markerWidth - glyphCellWidth({ glyph })));
}

function glyphCellWidth({ glyph }: { glyph: string }): number {
  if (glyph === "⏺") {
    return 2;
  }

  return 1;
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
      {rows.length === 0 && <Text dimColor>No activity yet</Text>}
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

function footerTone({
  message,
}: {
  message: DashboardControlMessage | undefined;
}): "gray" | "yellow" | "red" | undefined {
  if (message?.tone === "yellow" || message?.tone === "red") {
    return message.tone;
  }

  return undefined;
}

type ActivityFeedRow = {
  id: string;
  label: string;
  body: string;
  tone: "gray" | "cyan" | "yellow" | "red";
};

function buildDashboardTasks({
  tasks,
  agents,
  hypotheses,
  experiments,
  evaluations,
  experimentActivities,
  evaluationActivities,
}: {
  tasks: TaskRecord[];
  agents: AgentRecord[];
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  evaluations: EvaluationRecord[];
  experimentActivities: ExperimentActivityRecord[];
  evaluationActivities: EvaluationActivityRecord[];
}): DashboardTask[] {
  void agents;

  if (tasks.length > 0) {
    const taskRows = tasks.map((task) => taskFromTaskRecord({ task }));

    return lodash.orderBy(
      taskRows,
      [
        (task) => sortRankForTask({ task }),
        (task) => priorityRankForDashboardTask({ task }),
        (task) => task.title,
      ],
      ["asc", "asc", "asc"],
    );
  }

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

function taskFromTaskRecord({
  task,
}: {
  task: TaskRecord;
}): DashboardTask {
  return {
    id: `task:${task.id}`,
    title: task.title,
    status: statusForTaskRecord({ status: task.status }),
    kind: "task",
    tone: toneForTaskRecord({ task }),
  };
}

function statusForTaskRecord({
  status,
}: {
  status: TaskRecord["status"];
}): DashboardTaskStatus {
  if (status === "in_progress") {
    return "in-progress";
  }

  if (status === "done" || status === "abandoned" || status === "failed") {
    return "done";
  }

  return "todo";
}

function toneForTaskRecord({
  task,
}: {
  task: TaskRecord;
}): DashboardTaskTone | undefined {
  if (task.status === "failed" || task.status === "abandoned") {
    return "danger";
  }

  if (task.priority === "urgent" || task.priority === "high") {
    return "warning";
  }

  if (task.status === "done") {
    return "success";
  }

  return undefined;
}

function priorityRankForDashboardTask({ task }: { task: DashboardTask }): number {
  if (task.tone === "danger") {
    return 0;
  }

  if (task.tone === "warning") {
    return 1;
  }

  return 2;
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
  tasks,
  hypotheses,
  experiments,
  evaluations,
  taskActivities,
  hypothesisActivities,
  experimentActivities,
  evaluationActivities,
  events,
  maxRows,
  width,
}: {
  tasks: TaskRecord[];
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  evaluations: EvaluationRecord[];
  taskActivities: TaskActivityRecord[];
  hypothesisActivities: HypothesisActivityRecord[];
  experimentActivities: ExperimentActivityRecord[];
  evaluationActivities: EvaluationActivityRecord[];
  events: EventRecord[];
  maxRows: number;
  width: number;
}): ActivityFeedRow[] {
  const tasksById = lodash.keyBy(tasks, "id");
  const hypothesesById = lodash.keyBy(hypotheses, "id");
  const experimentsById = lodash.keyBy(experiments, "id");
  const evaluationsById = lodash.keyBy(evaluations, "id");
  const rows = [
    ...taskActivities.map((activity) =>
      activityRow({
        id: `task-activity:${activity.id}`,
        label: "task",
        body: activityBody({
          parentTitle: tasksById[activity.task_id]?.title,
          body: activity.body,
        }),
        tone: activityTone({ payload: activity.payload }),
        createdAt: activity.created_at,
      }),
    ),
    ...hypothesisActivities.map((activity) =>
      activityRow({
        id: `hypothesis-activity:${activity.id}`,
        label: activityLabel({ payload: activity.payload }),
        body: activityBody({
          parentTitle: hypothesesById[activity.hypothesis_id]?.title,
          body: activity.body,
        }),
        tone: activityTone({ payload: activity.payload }),
        createdAt: activity.created_at,
      }),
    ),
    ...experimentActivities.map((activity) =>
      activityRow({
        id: `experiment-activity:${activity.id}`,
        label: activityLabel({ payload: activity.payload }),
        body: activityBody({
          parentTitle: experimentsById[activity.experiment_id]?.title,
          body: activity.body,
        }),
        tone: activityTone({ payload: activity.payload }),
        createdAt: activity.created_at,
      }),
    ),
    ...evaluationActivities.map((activity) =>
      activityRow({
        id: `evaluation-activity:${activity.id}`,
        label: activityLabel({ payload: activity.payload }),
        body: activityBody({
          parentTitle: evaluationsById[activity.evaluation_id]?.title,
          body: activity.body,
        }),
        tone: activityTone({ payload: activity.payload }),
        createdAt: activity.created_at,
      }),
    ),
    ...events.map((event) =>
      activityRow({
        id: `event:${event.id}`,
        label: "event",
        body: event.message,
        tone: eventTone({ event }),
        createdAt: event.created_at,
      }),
    ),
  ];

  return lodash
    .orderBy(
      rows,
      [(row) => timestampMillis({ isoTimestamp: row.createdAt }), (row) => row.id],
      ["asc", "asc"],
    )
    .slice(-maxRows)
    .map((row) => ({
      id: row.id,
      label: row.label,
      body: previewText({
        value: row.body,
        maxCharacters: Math.max(12, width - 12),
      }),
      tone: row.tone,
    }));
}

type RawActivityFeedRow = ActivityFeedRow & {
  createdAt: string;
};

function activityRow({
  id,
  label,
  body,
  tone,
  createdAt,
}: RawActivityFeedRow): RawActivityFeedRow {
  return {
    id,
    label,
    body,
    tone,
    createdAt,
  };
}

function activityBody({
  parentTitle,
  body,
}: {
  parentTitle: string | undefined;
  body: string;
}): string {
  return parentTitle ? `${parentTitle}: ${body}` : body;
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
  taskActivities,
  hypothesisActivities,
  experimentActivities,
  evaluationActivities,
}: {
  taskActivities: TaskActivityRecord[];
  hypothesisActivities: HypothesisActivityRecord[];
  experimentActivities: ExperimentActivityRecord[];
  evaluationActivities: EvaluationActivityRecord[];
}): number {
  return [
    ...taskActivities,
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
  payload,
}: {
  payload: Record<string, unknown> | undefined;
}): string {
  const activityType = payload?.activity_type;

  if (activityType === "concern") {
    return "concern";
  }

  if (activityType === "result") {
    return "result";
  }

  return "update";
}

function activityTone({
  payload,
}: {
  payload: Record<string, unknown> | undefined;
}): "gray" | "cyan" | "yellow" | "red" {
  const activityType = payload?.activity_type;

  if (activityType === "concern") {
    return "yellow";
  }

  if (activityType === "result") {
    return "cyan";
  }

  return "gray";
}

function eventTone({ event }: { event: EventRecord }): "gray" | "cyan" | "yellow" | "red" {
  if (event.type.includes("failed") || event.type.includes("error")) {
    return "red";
  }

  if (event.type.includes("concern")) {
    return "yellow";
  }

  if (event.type.includes("started")) {
    return "cyan";
  }

  return "gray";
}

function lastActivitySummary({
  taskActivities,
  hypothesisActivities,
  experimentActivities,
  evaluationActivities,
  events,
}: {
  taskActivities: TaskActivityRecord[];
  hypothesisActivities: HypothesisActivityRecord[];
  experimentActivities: ExperimentActivityRecord[];
  evaluationActivities: EvaluationActivityRecord[];
  events: EventRecord[];
}): string | undefined {
  const latest = lodash
    .orderBy(
      [
        ...taskActivities.map((activity) => ({
          kind: "task",
          createdAt: activity.created_at,
        })),
        ...hypothesisActivities.map((activity) => ({
          kind: "hypothesis",
          createdAt: activity.created_at,
        })),
        ...experimentActivities.map((activity) => ({
          kind: activityLabel({ payload: activity.payload }),
          createdAt: activity.created_at,
        })),
        ...evaluationActivities.map((activity) => ({
          kind: activityLabel({ payload: activity.payload }),
          createdAt: activity.created_at,
        })),
        ...events.map((event) => ({
          kind: "event",
          createdAt: event.created_at,
        })),
      ],
      [(entry) => timestampMillis({ isoTimestamp: entry.createdAt })],
      ["desc"],
    )
    .at(0);

  if (!latest) {
    return undefined;
  }

  return `last ${latest.kind} ${timeLabel({ isoTimestamp: latest.createdAt })}`;
}

function useTaskGlyph({
  task,
  loaderKind,
}: {
  task: DashboardTask;
  loaderKind: DashboardTaskLoaderKind;
}): string {
  const isAnimated =
    task.status === "in-progress" &&
    task.tone !== "danger" &&
    task.kind !== "concern";
  const animatedGlyph = useInProgressLoaderGlyph({
    isActive: isAnimated,
    kind: loaderKind,
  });

  if (isAnimated) {
    return animatedGlyph;
  }

  return glyphForTask({ task });
}

function useInProgressLoaderGlyph({
  isActive,
  kind,
}: {
  isActive: boolean;
  kind: DashboardTaskLoaderKind;
}): string {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const interval = setInterval(() => {
      setFrameIndex((currentFrameIndex) => currentFrameIndex + 1);
    }, 450);

    return () => {
      clearInterval(interval);
    };
  }, [isActive]);

  if (!isActive) {
    return "⏺";
  }

  const frames = loaderFrames({ kind });
  return frames[frameIndex % frames.length] ?? "⏺";
}

function loaderFrames({ kind }: { kind: DashboardTaskLoaderKind }): string[] {
  if (kind === "burst") {
    return ["·", "*", "✢", "✳", "✻", "✶"];
  }

  return ["⏺", "○"];
}

function glyphForTask({ task }: { task: DashboardTask }): string {
  if (task.status === "done") {
    return "⏺";
  }

  if (task.status === "in-progress") {
    return "⏺";
  }

  return "○";
}

function glyphColorForTask({
  task,
}: {
  task: DashboardTask;
}): "gray" | "cyan" | "yellow" | "green" | "red" {
  if (task.tone === "danger") {
    return "red";
  }

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

function timeLabel({ isoTimestamp }: { isoTimestamp: string }): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return isoTimestamp;
  }

  return `${date.toISOString().slice(11, 19)}Z`;
}

function timestampMillis({ isoTimestamp }: { isoTimestamp: string }): number {
  const timestamp = Date.parse(isoTimestamp);

  if (Number.isNaN(timestamp)) {
    return 0;
  }

  return timestamp;
}

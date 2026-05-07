import lodash from "lodash";
import { Text, useInput, useStdin } from "ink";
import { useEffect, useState } from "react";
import type {
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
  TaskEntityLinkRecord,
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
  MIN_DASHBOARD_TERMINAL_WIDTH,
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
  taskLabel?: string;
  taskKind?: TaskRecord["kind"];
  tone?: DashboardTaskTone;
  linkedOutputLabels?: string[];
  createdAt?: string;
  availableAt?: string;
  claimedAt?: string | null;
  completedAt?: string | null;
  updatedAt?: string;
};

export function FullscreenDashboard({
  workspace,
  statusLine,
  dashboardMessage,
  project,
  session,
  tasks,
  experimentCount,
  maxExperiments,
  hypotheses,
  experiments,
  evaluations,
  taskEntityLinks = [],
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
  tasks: TaskRecord[];
  experimentCount: number;
  maxExperiments: number;
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  evaluations: EvaluationRecord[];
  taskEntityLinks?: TaskEntityLinkRecord[];
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
  const [searchQuery, setSearchQuery] = useState("");
  const { isRawModeSupported: rawModeSupported } = useStdin();
  const idleEscActive =
    Boolean(process.stdin.isTTY) &&
    rawModeSupported &&
    controlMode === "idle" &&
    searchQuery.length > 0;

  useInput(
    (_input, key) => {
      if (key.escape) {
        setSearchQuery("");
      }
    },
    { isActive: idleEscActive },
  );

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
        terminalWidth={layout.terminalWidth}
        terminalHeight={layout.terminalHeight}
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
  const allDashboardTasks = buildDashboardTasks({
    tasks,
    hypotheses,
    experiments,
    evaluations,
    taskEntityLinks,
    experimentActivities,
    evaluationActivities,
  });
  const allActivityRows = buildActivityRows({
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
  const dashboardTasks = filterDashboardTasks({
    tasks: allDashboardTasks,
    query: searchQuery,
  });
  const activityRows = filterActivityRows({
    rows: allActivityRows,
    query: searchQuery,
  });
  const filterActive = searchQuery.length > 0;
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
    project,
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
        label={sectionLabel({ base: "tasks", filterActive, query: searchQuery })}
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
        label={activitySectionLabel({
          mode: controlMode,
          filterActive,
          query: searchQuery,
        })}
        width={layout.width}
        height={layout.activityHeight}
      >
        {controlMode === "commands" && (
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
        )}
        {controlMode === "help" && (
          <HelpPane
            width={layout.contentWidth}
            height={layout.activityHeight}
            onClose={() => {
              setControlMode("idle");
            }}
          />
        )}
        {controlMode === "search" && (
          <SearchPane
            width={layout.contentWidth}
            height={layout.activityHeight}
            query={searchQuery}
            onQueryChange={({ query }) => {
              setSearchQuery(query);
            }}
            onSubmit={() => {
              setControlMode("idle");
            }}
            onCancel={() => {
              setSearchQuery("");
              setControlMode("idle");
            }}
          />
        )}
        {controlMode === "idle" && (
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

function sectionLabel({
  base,
  filterActive,
  query,
}: {
  base: string;
  filterActive: boolean;
  query: string;
}): string {
  if (!filterActive) {
    return base;
  }

  return `${base} · filtered: ${query}`;
}

function activitySectionLabel({
  mode,
  filterActive,
  query,
}: {
  mode: DashboardControlMode;
  filterActive: boolean;
  query: string;
}): string {
  if (mode === "commands") return "commands";
  if (mode === "help") return "help";
  if (mode === "search") return "search";
  return sectionLabel({ base: "activity", filterActive, query });
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

const HELP_BINDINGS: Array<{ keys: string; description: string }> = [
  { keys: "?", description: "Toggle this help overlay" },
  { keys: "/", description: "Search & filter tasks and activity" },
  { keys: ":", description: "Open the commands palette" },
  { keys: "Esc", description: "Close overlay or clear active filter" },
  { keys: "Enter", description: "Select / apply (in palette or search)" },
  { keys: "↑ ↓", description: "Move within prompts" },
  { keys: "q", description: "Quit the dashboard" },
];

function HelpPane({
  width,
  height,
  onClose,
}: {
  width: number;
  height: number;
  onClose: () => void;
}) {
  const { isRawModeSupported } = useStdin();
  const canUseInput = Boolean(process.stdin.isTTY) && isRawModeSupported;

  useInput(
    (input, key) => {
      if (key.escape || input === "?") {
        onClose();
      }
    },
    { isActive: canUseInput },
  );

  const keyColumnWidth = HELP_BINDINGS.reduce(
    (currentMax, binding) => Math.max(currentMax, binding.keys.length),
    0,
  );

  return (
    <LayoutBox width={width} height={height}>
      <Text bold>Keyboard controls</Text>
      {HELP_BINDINGS.map((binding) => (
        <Text key={binding.keys}>
          <Text color="cyan">{binding.keys.padEnd(keyColumnWidth)}</Text>
          <Text>  {binding.description}</Text>
        </Text>
      ))}
      <Text> </Text>
      <Text dimColor>
        Search filters apply to task titles and activity bodies (case-insensitive).
      </Text>
    </LayoutBox>
  );
}

function SearchPane({
  width,
  height,
  query,
  onQueryChange,
  onSubmit,
  onCancel,
}: {
  width: number;
  height: number;
  query: string;
  onQueryChange: ({ query }: { query: string }) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const { isRawModeSupported } = useStdin();
  const canUseInput = Boolean(process.stdin.isTTY) && isRawModeSupported;

  useInput(
    (input, key) => {
      if (key.escape) {
        onCancel();
        return;
      }

      if (key.return) {
        onSubmit();
        return;
      }

      if (key.backspace || key.delete) {
        onQueryChange({ query: query.slice(0, -1) });
        return;
      }

      if (key.ctrl || key.meta || key.upArrow || key.downArrow) {
        return;
      }

      if (input) {
        onQueryChange({ query: query + input });
      }
    },
    { isActive: canUseInput },
  );

  return (
    <LayoutBox width={width} height={height}>
      <Text>
        <Text color="cyan">/ </Text>
        <Text bold>{query}</Text>
        <Text inverse> </Text>
      </Text>
      <Text> </Text>
      <Text dimColor>
        Filters tasks and activity live. Enter applies the filter and returns to the dashboard.
        Esc clears the filter.
      </Text>
    </LayoutBox>
  );
}

function filterDashboardTasks({
  tasks,
  query,
}: {
  tasks: DashboardTask[];
  query: string;
}): DashboardTask[] {
  if (query.length === 0) {
    return tasks;
  }

  const needle = query.toLowerCase();
  return tasks.filter(
    (task) =>
      readableDashboardTaskTitle({ task }).toLowerCase().includes(needle) ||
      (task.linkedOutputLabels ?? []).some((label) =>
        label.toLowerCase().includes(needle),
      ),
  );
}

function filterActivityRows({
  rows,
  query,
}: {
  rows: ActivityFeedRow[];
  query: string;
}): ActivityFeedRow[] {
  if (query.length === 0) {
    return rows;
  }

  const needle = query.toLowerCase();
  return rows.filter(
    (row) =>
      row.body.toLowerCase().includes(needle) ||
      row.label.toLowerCase().includes(needle),
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
  const sessionContext = statusLine || "Waiting for a session";
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
  const todoTasks = tasksForTaskColumn({ tasks, status: "todo" });
  const inProgressTasks = tasksForTaskColumn({ tasks, status: "in-progress" });
  const doneTasks = tasksForTaskColumn({ tasks, status: "done" });

  return (
    <LayoutBox direction="row" height={height}>
      <TaskColumn
        title="TODO"
        tasks={todoTasks}
        loaderKind={loaderKind}
        width={columnWidths[0]}
        height={height}
        maxRows={maxRowsPerColumn}
        collapseOlderDoneTasks={false}
      />
      <TaskColumnDivider height={height} />
      <TaskColumn
        title="IN PROGRESS"
        tasks={inProgressTasks}
        loaderKind={loaderKind}
        width={columnWidths[1]}
        height={height}
        maxRows={maxRowsPerColumn}
        collapseOlderDoneTasks={false}
      />
      <TaskColumnDivider height={height} />
      <TaskColumn
        title="DONE"
        tasks={doneTasks}
        loaderKind={loaderKind}
        width={columnWidths[2]}
        height={height}
        maxRows={maxRowsPerColumn}
        collapseOlderDoneTasks
      />
    </LayoutBox>
  );
}

function tasksForTaskColumn({
  tasks,
  status,
}: {
  tasks: DashboardTask[];
  status: DashboardTaskStatus;
}): DashboardTask[] {
  const columnTasks = tasks.filter((task) => task.status === status);

  if (status === "done") {
    return lodash.orderBy(
      columnTasks,
      [
        (task) => taskDoneTimestampMillis({ task }),
        (task) => readableDashboardTaskTitle({ task }).toLowerCase(),
        (task) => task.id,
      ],
      ["desc", "asc", "asc"],
    );
  }

  return lodash.orderBy(
    columnTasks,
    [
      (task) => priorityRankForDashboardTask({ task }),
      (task) => taskActiveTimestampMillis({ task }),
      (task) => readableDashboardTaskTitle({ task }).toLowerCase(),
      (task) => task.id,
    ],
    ["asc", "asc", "asc", "asc"],
  );
}

function taskDoneTimestampMillis({ task }: { task: DashboardTask }): number {
  return timestampMillisOrZero({
    isoTimestamp: task.completedAt ?? task.updatedAt ?? task.createdAt,
  });
}

function taskActiveTimestampMillis({ task }: { task: DashboardTask }): number {
  return timestampMillisOrZero({
    isoTimestamp:
      task.claimedAt ?? task.availableAt ?? task.createdAt ?? task.updatedAt,
  });
}

function collapseRepeatedDoneTasks({
  tasks,
}: {
  tasks: DashboardTask[];
}): { tasks: DashboardTask[]; hiddenCount: number } {
  const visibleTasks: DashboardTask[] = [];
  const seenKeys = new Set<string>();
  let hiddenCount = 0;

  for (const task of tasks) {
    const key = repeatedDoneTaskKey({ task });
    if (!key) {
      visibleTasks.push(task);
      continue;
    }

    if (seenKeys.has(key)) {
      hiddenCount += 1;
      continue;
    }

    seenKeys.add(key);
    visibleTasks.push(task);
  }

  return { tasks: visibleTasks, hiddenCount };
}

function repeatedDoneTaskKey({
  task,
}: {
  task: DashboardTask;
}): string | undefined {
  if (task.status !== "done") {
    return undefined;
  }

  if ((task.linkedOutputLabels?.length ?? 0) > 0) {
    return undefined;
  }

  return readableDashboardTaskTitle({ task }).toLowerCase();
}

function hiddenTaskLabel({
  count,
  collapseOlderDoneTasks,
}: {
  count: number;
  collapseOlderDoneTasks: boolean;
}): string {
  if (!collapseOlderDoneTasks) {
    return `+ ${count} more`;
  }

  const noun = count === 1 ? "task" : "tasks";
  return `+ ${count} older done ${noun}`;
}

function TaskColumn({
  title,
  tasks,
  loaderKind,
  width,
  height,
  maxRows,
  collapseOlderDoneTasks,
}: {
  title: string;
  tasks: DashboardTask[];
  loaderKind: DashboardTaskLoaderKind;
  width: number;
  height: number;
  maxRows: number;
  collapseOlderDoneTasks: boolean;
}) {
  const rowWidth = width;
  const preparedTasks = collapseOlderDoneTasks
    ? collapseRepeatedDoneTasks({ tasks })
    : { tasks, hiddenCount: 0 };
  const visibleTaskRows = visibleTaskRowsForColumn({
    tasks: preparedTasks.tasks,
    width: rowWidth,
    maxRows,
    hiddenTaskCountAfterList: preparedTasks.hiddenCount,
  });
  const hiddenTaskCount =
    preparedTasks.hiddenCount +
    Math.max(0, preparedTasks.tasks.length - visibleTaskRows.length);
  const taskBodyRowCount = lodash.sumBy(
    visibleTaskRows,
    (task) => taskRowLineCount({ task, width: rowWidth }),
  );
  const bodyRowCount =
    taskBodyRowCount +
    (tasks.length === 0 ? 1 : 0) +
    (hiddenTaskCount > 0 ? 1 : 0);
  const blankRowCount = Math.max(0, maxRows - bodyRowCount);

  return (
    <LayoutBox width={width} height={height}>
      <Text color="gray" bold>{fitRow({ value: title, width: rowWidth })}</Text>
      {tasks.length === 0 && (
        <Text dimColor>{fitRow({ value: "No tasks", width: rowWidth })}</Text>
      )}
      {visibleTaskRows.map((task) => (
        <TaskRows
          key={task.id}
          task={task}
          loaderKind={loaderKind}
          width={rowWidth}
        />
      ))}
      {hiddenTaskCount > 0 && (
        <Text dimColor>
          {fitRow({
            value: hiddenTaskLabel({
              count: hiddenTaskCount,
              collapseOlderDoneTasks,
            }),
            width: rowWidth,
          })}
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

function TaskRows({
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
  const taskLabel = taskReferenceLabel({ task });
  const labelText = taskLabel ? ` ${taskLabel}` : "";
  const leadingWidth = 2 + labelText.length;
  const titleWidth = Math.max(0, width - leadingWidth);
  const titleLines = taskTitleLines({ task, width });
  const outputLine = taskOutputLineForDashboard({
    labels: task.linkedOutputLabels ?? [],
    width,
  });

  if (width <= leadingWidth) {
    return <Text color={glyphColor}>{fitRow({ value: glyph, width })}</Text>;
  }

  return (
    <>
      {titleLines.map((line, index) => (
        <Text key={`${task.id}:line:${index}`}>
          {index === 0 ? (
            <>
              <Text color={glyphColor}>{glyph}</Text>
              {`${labelText} ${fitRow({ value: line, width: titleWidth })}`}
            </>
          ) : (
            `${" ".repeat(leadingWidth)}${fitRow({ value: line, width: titleWidth })}`
          )}
        </Text>
      ))}
      {outputLine && (
        <Text key={`${task.id}:outputs`} dimColor>
          {fitRow({ value: outputLine, width })}
        </Text>
      )}
    </>
  );
}

export function taskOutputLineForDashboard({
  labels,
  width,
}: {
  labels: string[];
  width: number;
}): string | undefined {
  const visibleLabels = lodash.uniq(labels.filter(Boolean));
  if (visibleLabels.length === 0 || width <= 2) {
    return undefined;
  }

  for (let labelCount = visibleLabels.length; labelCount >= 0; labelCount -= 1) {
    const shownLabels = visibleLabels.slice(0, labelCount);
    const hiddenCount = visibleLabels.length - shownLabels.length;
    const hiddenLabel = hiddenCount > 0 ? `+${hiddenCount}` : undefined;
    const lineLabels = hiddenLabel ? [...shownLabels, hiddenLabel] : shownLabels;
    const line = `→ ${lineLabels.join(" ")}`.trimEnd();

    if (lineLabels.length > 0 && line.length <= width) {
      return line;
    }
  }

  return fitRow({ value: `→ ${visibleLabels[0] ?? ""}`, width });
}

function visibleTaskRowsForColumn({
  tasks,
  width,
  maxRows,
  hiddenTaskCountAfterList = 0,
}: {
  tasks: DashboardTask[];
  width: number;
  maxRows: number;
  hiddenTaskCountAfterList?: number;
}): DashboardTask[] {
  const visibleTasks: DashboardTask[] = [];
  let usedRows = 0;

  for (const task of tasks) {
    const rowCount = taskRowLineCount({ task, width });
    const remainingTaskCount = tasks.length - visibleTasks.length - 1;
    const hiddenTaskCount = remainingTaskCount + hiddenTaskCountAfterList;
    const reservedMoreRowCount = hiddenTaskCount > 0 ? 1 : 0;

    if (usedRows + rowCount + reservedMoreRowCount > maxRows) {
      break;
    }

    visibleTasks.push(task);
    usedRows += rowCount;
  }

  return visibleTasks;
}

function taskRowLineCount({
  task,
  width,
}: {
  task: DashboardTask;
  width: number;
}): number {
  const outputLine = taskOutputLineForDashboard({
    labels: task.linkedOutputLabels ?? [],
    width,
  });

  return taskTitleLines({ task, width }).length + (outputLine ? 1 : 0);
}

function taskTitleLines({
  task,
  width,
}: {
  task: DashboardTask;
  width: number;
}): string[] {
  const taskLabel = taskReferenceLabel({ task });
  const leadingWidth = 2 + (taskLabel ? taskLabel.length + 1 : 0);
  const titleWidth = Math.max(1, width - leadingWidth);

  return wrapTaskTitleForDashboard({
    title: readableDashboardTaskTitle({ task }),
    width: titleWidth,
    maxLines: 2,
  });
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
  terminalWidth,
  terminalHeight,
  onDashboardCommand,
}: {
  width: number;
  height: number;
  terminalWidth: number;
  terminalHeight: number;
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
          {`Situ needs at least ${MIN_DASHBOARD_TERMINAL_WIDTH}x${MIN_DASHBOARD_HEIGHT} to render.`}
        </Text>
        <Text dimColor>Current size {terminalWidth}x{terminalHeight}</Text>
        <Text dimColor>Press q to quit.</Text>
        <SmallTerminalControls onDashboardCommand={onDashboardCommand} />
      </PaneSection>
    </LayoutBox>
  );
}

function SmallTerminalControls({
  onDashboardCommand,
}: {
  onDashboardCommand: ({ command }: { command: DashboardCommand }) => void;
}) {
  const { isRawModeSupported } = useStdin();
  const canUseInput = Boolean(process.stdin.isTTY) && isRawModeSupported;

  useInput(
    (input) => {
      if (input === "?") {
        onDashboardCommand({ command: "help" });
        return;
      }

      if (input === "q") {
        onDashboardCommand({ command: "quit" });
      }
    },
    { isActive: canUseInput },
  );

  return <Text dimColor>? help · q quit</Text>;
}

function dashboardHeaderLabel({
  workspace,
  project,
  session,
}: {
  workspace: string;
  project: ProjectRecord | undefined;
  session: SessionRecord | undefined;
}): string {
  const sessionLabel = session
    ? `${session.id} ${session.status}`
    : "no session";
  const projectLabel = project?.title || workspaceName({ workspace });

  return `SITU / ${projectLabel} / ${sessionLabel}`;
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
  hypotheses,
  experiments,
  evaluations,
  taskEntityLinks,
  experimentActivities,
  evaluationActivities,
}: {
  tasks: TaskRecord[];
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  evaluations: EvaluationRecord[];
  taskEntityLinks: TaskEntityLinkRecord[];
  experimentActivities: ExperimentActivityRecord[];
  evaluationActivities: EvaluationActivityRecord[];
}): DashboardTask[] {
  if (tasks.length > 0) {
    const taskRows = tasks.map((task) =>
      taskFromTaskRecord({ task, taskEntityLinks }),
    );

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
      createdAt: hypothesis.created_at,
      updatedAt: hypothesis.updated_at,
    }));

  return lodash.orderBy(
    [...experimentTasks, ...evaluationTasks, ...hypothesisTasks],
    [(task) => sortRankForTask({ task }), (task) => task.title],
    ["asc", "asc"],
  );
}

function taskFromTaskRecord({
  task,
  taskEntityLinks,
}: {
  task: TaskRecord;
  taskEntityLinks: TaskEntityLinkRecord[];
}): DashboardTask {
  return {
    id: `task:${task.id}`,
    title: task.title,
    status: statusForTaskRecord({ status: task.status }),
    kind: "task",
    taskLabel: taskLabelFromId({ id: task.id }),
    taskKind: task.kind,
    tone: toneForTaskRecord({ task }),
    linkedOutputLabels: linkedOutputLabelsForTask({ task, taskEntityLinks }),
    createdAt: task.created_at,
    availableAt: task.available_at,
    claimedAt: task.claimed_at,
    completedAt: task.completed_at,
    updatedAt: task.updated_at,
  };
}

const TASK_OUTPUT_ENTITY_KIND_ORDER: TaskEntityLinkRecord["entity_kind"][] = [
  "experiment",
  "evaluation",
  "artifact",
  "analysis",
  "hypothesis",
  "baseline",
  "measurement",
];

const TASK_OUTPUT_ENTITY_PREFIX_BY_KIND: Partial<
  Record<TaskEntityLinkRecord["entity_kind"], string>
> = {
  analysis: "A",
  baseline: "B",
  hypothesis: "H",
  experiment: "EX",
  evaluation: "EV",
  measurement: "M",
  artifact: "ART",
};

function linkedOutputLabelsForTask({
  task,
  taskEntityLinks,
}: {
  task: TaskRecord;
  taskEntityLinks: TaskEntityLinkRecord[];
}): string[] {
  const linkRows = taskEntityLinks
    .filter((link) => link.task_id === task.id)
    .map((link) => ({
      link,
      label: taskOutputLabelFromLink({ link }),
      rank: taskOutputEntityKindRank({ entityKind: link.entity_kind }),
      createdAtMillis: timestampMillisOrZero({ isoTimestamp: link.created_at }),
    }))
    .filter(
      (
        row,
      ): row is {
        link: TaskEntityLinkRecord;
        label: string;
        rank: number;
        createdAtMillis: number;
      } => row.label !== undefined,
    );
  const sortedRows = lodash.orderBy(
    linkRows,
    [(row) => row.rank, (row) => row.createdAtMillis, (row) => row.label],
    ["asc", "asc", "asc"],
  );
  const labels: string[] = [];
  const seenLabels = new Set<string>();

  for (const row of sortedRows) {
    if (seenLabels.has(row.label)) {
      continue;
    }

    seenLabels.add(row.label);
    labels.push(row.label);
  }

  return labels;
}

function taskOutputEntityKindRank({
  entityKind,
}: {
  entityKind: TaskEntityLinkRecord["entity_kind"];
}): number {
  const rank = TASK_OUTPUT_ENTITY_KIND_ORDER.indexOf(entityKind);
  if (rank >= 0) {
    return rank;
  }

  return TASK_OUTPUT_ENTITY_KIND_ORDER.length;
}

function taskOutputLabelFromLink({
  link,
}: {
  link: TaskEntityLinkRecord;
}): string | undefined {
  const prefix = TASK_OUTPUT_ENTITY_PREFIX_BY_KIND[link.entity_kind];
  if (!prefix) {
    return undefined;
  }

  const entityId = link.entity_id.trim();
  if (!entityId) {
    return undefined;
  }

  const canonicalLabel = entityId.toUpperCase();
  if (canonicalEntityLabelMatchesPrefix({ label: canonicalLabel, prefix })) {
    return canonicalLabel;
  }

  if (/^[1-9]\d*$/.test(entityId)) {
    return `${prefix}${entityId}`;
  }

  return undefined;
}

function canonicalEntityLabelMatchesPrefix({
  label,
  prefix,
}: {
  label: string;
  prefix: string;
}): boolean {
  return new RegExp(`^${lodash.escapeRegExp(prefix)}[1-9]\\d*$`).test(label);
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
    title: readableExperimentDashboardTitle({ experiment }),
    status: statusForRecord({ status: experiment.status }),
    kind: tone === "warning" ? "concern" : "experiment",
    tone,
    createdAt: experiment.created_at,
    updatedAt: experiment.updated_at,
  };
}

export function readableExperimentDashboardTitle({
  experiment,
}: {
  experiment: ExperimentRecord;
}): string {
  const lineage = [
    experiment.research_thread
      ? `thread ${experiment.research_thread}`
      : undefined,
    experiment.parent_experiment_id
      ? `parent ${experiment.parent_experiment_id}`
      : undefined,
    experiment.candidate_commit
      ? `cand ${shortCommitRef({ value: experiment.candidate_commit })}`
      : undefined,
  ].filter((value): value is string => Boolean(value));

  if (lineage.length === 0) {
    return experiment.title;
  }

  return `${experiment.title} [${lineage.join(" | ")}]`;
}

function shortCommitRef({ value }: { value: string }): string {
  return value.length > 7 ? value.slice(0, 7) : value;
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
    createdAt: evaluation.created_at,
    updatedAt: evaluation.updated_at,
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
    return "●";
  }

  const frames = loaderFrames({ kind });
  return frames[frameIndex % frames.length] ?? "●";
}

function loaderFrames({ kind }: { kind: DashboardTaskLoaderKind }): string[] {
  if (kind === "burst") {
    return ["·", "*", "✢", "✳", "✻", "✶"];
  }

  return ["●", "○"];
}

function glyphForTask({ task }: { task: DashboardTask }): string {
  if (task.status === "done") {
    return "●";
  }

  if (task.status === "in-progress") {
    return "●";
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

export function taskLabelFromId({ id }: { id: string }): string | undefined {
  const canonicalMatch = /^T([1-9]\d*)$/i.exec(id);
  if (canonicalMatch?.[1]) {
    return `[T${canonicalMatch[1]}]`;
  }

  return undefined;
}

function taskReferenceLabel({ task }: { task: DashboardTask }): string | undefined {
  return task.taskLabel ?? taskLabelFromId({ id: task.id });
}

export function readableDashboardTaskTitle({
  task,
}: {
  task: DashboardTask;
}): string {
  const title = normalizeTaskTitle({ title: task.title });
  if (!task.taskKind || startsWithActionVerb({ title })) {
    return title || "Untitled task";
  }

  const prefix = taskKindTitlePrefix({ taskKind: task.taskKind });
  return `${prefix} ${title || "next step"}`;
}

export function wrapTaskTitleForDashboard({
  title,
  width,
  maxLines,
}: {
  title: string;
  width: number;
  maxLines: number;
}): string[] {
  if (width <= 0 || maxLines <= 0) {
    return [];
  }

  const words = normalizeTaskTitle({ title }).split(" ").filter(Boolean);
  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let currentLine = "";
  let wordIndex = 0;
  let truncated = false;

  while (wordIndex < words.length && lines.length < maxLines) {
    const word = words[wordIndex] ?? "";

    if (word.length > width) {
      if (currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = "";
        continue;
      }

      lines.push(word.slice(0, width));
      words[wordIndex] = word.slice(width);
      truncated = wordIndex < words.length && lines.length >= maxLines;
      continue;
    }

    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= width) {
      currentLine = candidate;
      wordIndex += 1;
      continue;
    }

    if (!currentLine) {
      currentLine = word;
      wordIndex += 1;
      continue;
    }

    lines.push(currentLine);
    currentLine = "";
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
    currentLine = "";
  }

  if (wordIndex < words.length || currentLine) {
    truncated = true;
  }

  const visibleLines = lines.slice(0, maxLines);
  if (visibleLines.length === 0) {
    return [""];
  }

  if (truncated) {
    visibleLines[visibleLines.length - 1] = ellipsizeLine({
      value: visibleLines[visibleLines.length - 1] ?? "",
      width,
    });
  }

  return visibleLines;
}

function normalizeTaskTitle({ title }: { title: string }): string {
  const normalizedTitle = title
    .replace(/\s+/g, " ")
    .replace(/^(task|todo|to do|in progress|done)\s*[:.-]\s*/i, "")
    .replace(/^(manager|researcher|scientist|critic)\s*[:.-]\s*/i, "")
    .trim();

  return humanReadableWorkflowTaskTitle({ title: normalizedTitle });
}

function humanReadableWorkflowTaskTitle({ title }: { title: string }): string {
  if (/^plan after .+ (task completion|review)$/i.test(title)) {
    return "Plan next step";
  }

  return title;
}

function startsWithActionVerb({ title }: { title: string }): boolean {
  const firstToken = title
    .trim()
    .split(/\s+/)
    .at(0)
    ?.replace(/[^a-z-]/gi, "")
    .toLowerCase();

  if (!firstToken) {
    return false;
  }

  return ACTION_TITLE_VERBS.has(firstToken);
}

const ACTION_TITLE_VERBS = new Set([
  "add",
  "analyze",
  "benchmark",
  "capture",
  "check",
  "compare",
  "create",
  "debug",
  "establish",
  "evaluate",
  "explore",
  "find",
  "fix",
  "form",
  "identify",
  "improve",
  "inspect",
  "instrument",
  "map",
  "measure",
  "plan",
  "record",
  "reproduce",
  "research",
  "review",
  "run",
  "split",
  "summarize",
  "test",
  "tighten",
  "try",
  "update",
  "validate",
  "verify",
]);

function taskKindTitlePrefix({
  taskKind,
}: {
  taskKind: TaskRecord["kind"];
}): string {
  if (taskKind === "baseline") {
    return "Measure";
  }

  if (taskKind === "experiment") {
    return "Test";
  }

  if (taskKind === "hypothesize") {
    return "Form";
  }

  if (taskKind === "interpret") {
    return "Interpret";
  }

  if (taskKind === "review") {
    return "Review";
  }

  if (taskKind === "research") {
    return "Research";
  }

  return "Plan";
}

function ellipsizeLine({
  value,
  width,
}: {
  value: string;
  width: number;
}): string {
  if (width <= 1) {
    return "…";
  }

  if (value.length >= width) {
    return `${value.slice(0, width - 1)}…`;
  }

  return `${value}…`;
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

function timestampMillisOrZero({
  isoTimestamp,
}: {
  isoTimestamp: string | null | undefined;
}): number {
  if (!isoTimestamp) {
    return 0;
  }

  return timestampMillis({ isoTimestamp });
}

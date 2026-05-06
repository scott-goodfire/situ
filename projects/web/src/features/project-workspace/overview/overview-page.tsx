import type { ProjectRecord, SessionRecord } from "@situ/protocol";
import { mono } from "@situ/web-ui";
import {
  DEFAULT_MAX_EXPERIMENTS,
  activityFeed,
  concernCount,
  dashboardTasks,
  experimentBudgetBar,
  lastActivityLabel,
  type ActivityFeedRow,
  type DashboardTask,
} from "../../../selectors/dashboard";
import * as s from "../../../styles.css";
import type { ProjectWorkspaceData } from "../types";

const MAX_ACTIVITY_ROWS = 18;

export function OverviewPage({ data }: { data: ProjectWorkspaceData }) {
  const tasks = dashboardTasks({ data });
  const concerns = concernCount({ data });
  const lastLabel = lastActivityLabel({ data });
  const activeSession = data.sessions.find(
    (session) => session.status === "active",
  );

  return (
    <>
      <DashboardHeader
        workspace={data.workspace}
        project={data.project}
        session={activeSession}
        lastActivityLabel={lastLabel}
      />
      <DashboardCounts
        experimentCount={data.experiments.length}
        hypothesisCount={data.hypotheses.length}
        evaluationCount={data.evaluations.length}
        concernCount={concerns}
      />
      <TaskBoard tasks={tasks} />
      <DashboardActivity data={data} />
    </>
  );
}

function DashboardHeader({
  workspace,
  project,
  session,
  lastActivityLabel: latestLabel,
}: {
  workspace: string | undefined;
  project: ProjectRecord | undefined;
  session: SessionRecord | undefined;
  lastActivityLabel: string | undefined;
}) {
  const sessionState = session ? `${session.status} session` : "no session";
  const objective = project?.objective ?? "No active objective";
  const researchContext = project?.research_context || "No research context";
  const sessionContext = session ? session.id : "Waiting for a session";
  const workspaceLabel = workspace ?? "—";
  const activeLineSuffix = latestLabel ? ` · ${latestLabel}` : "";

  return (
    <section className={s.dashboardSection}>
      {project && <h2 className={s.dashboardHeaderTitle}>{project.title}</h2>}
      <p className={s.dashboardHeaderActive}>
        {sessionState} · {objective}
        {activeLineSuffix}
      </p>
      <p className={s.dashboardHeaderContext}>
        {workspaceLabel} · {sessionContext} · {researchContext}
      </p>
    </section>
  );
}

function DashboardCounts({
  experimentCount,
  hypothesisCount,
  evaluationCount,
  concernCount: concerns,
}: {
  experimentCount: number;
  hypothesisCount: number;
  evaluationCount: number;
  concernCount: number;
}) {
  return (
    <section className={s.dashboardSection}>
      <span className={s.dashboardSectionLabel}>counts</span>
      <div className={s.dashboardCounts}>
        <span className={s.dashboardCount}>
          <span className={s.dashboardCountLabel}>experiments</span>
          <span>
            {experimentCount}/{DEFAULT_MAX_EXPERIMENTS}
          </span>
          <span className={s.dashboardCountBudgetBar}>
            {experimentBudgetBar({
              current: experimentCount,
              total: DEFAULT_MAX_EXPERIMENTS,
            })}
          </span>
        </span>
        <span className={s.dashboardCount}>
          <span className={s.dashboardCountLabel}>hypotheses</span>
          <span>{hypothesisCount}</span>
        </span>
        <span className={s.dashboardCount}>
          <span className={s.dashboardCountLabel}>evaluations</span>
          <span>{evaluationCount}</span>
        </span>
        <span
          className={
            concerns > 0
              ? `${s.dashboardCount} ${s.dashboardCountConcern}`
              : s.dashboardCount
          }
        >
          <span className={s.dashboardCountLabel}>concerns</span>
          <span>{concerns}</span>
        </span>
      </div>
    </section>
  );
}

function TaskBoard({ tasks }: { tasks: DashboardTask[] }) {
  const todo = tasks.filter((task) => task.status === "todo");
  const inProgress = tasks.filter((task) => task.status === "in-progress");
  const done = tasks.filter((task) => task.status === "done");

  return (
    <section className={s.dashboardSection}>
      <span className={s.dashboardSectionLabel}>tasks</span>
      <div className={s.taskBoard}>
        <TaskColumn title="TODO" tasks={todo} />
        <TaskColumn title="IN PROGRESS" tasks={inProgress} />
        <TaskColumn title="DONE" tasks={done} />
      </div>
    </section>
  );
}

function TaskColumn({
  title,
  tasks,
}: {
  title: string;
  tasks: DashboardTask[];
}) {
  return (
    <div className={s.taskColumn}>
      <h3 className={s.taskColumnTitle}>{title}</h3>
      {tasks.length === 0 && (
        <p className={s.taskColumnEmpty}>No tasks</p>
      )}
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </div>
  );
}

function TaskRow({ task }: { task: DashboardTask }) {
  return (
    <div className={s.taskRow} data-tone={task.tone}>
      <span className={s.taskRowGlyph}>{glyphForTask({ task })}</span>
      <span className={s.taskRowTitle}>{task.title}</span>
    </div>
  );
}

function DashboardActivity({ data }: { data: ProjectWorkspaceData }) {
  const rows = activityFeed({ data, maxRows: MAX_ACTIVITY_ROWS });

  return (
    <section className={s.dashboardSection}>
      <span className={s.dashboardSectionLabel}>activity</span>
      {rows.length === 0 ? (
        <p className={s.dashboardEmpty}>No activity yet</p>
      ) : (
        <ul className={s.dashboardActivityList}>
          {rows.map((row) => (
            <ActivityRow key={row.id} row={row} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ActivityRow({ row }: { row: ActivityFeedRow }) {
  return (
    <li className={s.dashboardActivityRow}>
      <span className={`${s.dashboardActivityLabel} ${mono}`} data-tone={row.tone}>
        {row.label}
      </span>
      <span className={s.dashboardActivityBody} data-tone={row.tone}>
        {row.body}
      </span>
    </li>
  );
}

function glyphForTask({ task }: { task: DashboardTask }): string {
  if (task.tone === "danger" || task.kind === "concern") {
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

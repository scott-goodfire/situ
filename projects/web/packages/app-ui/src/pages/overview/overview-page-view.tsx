import { mono } from "@situ/web-ui";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { MarkdownText } from "../../shared/markdown-text";
import * as s from "../../styles.css";

export type DashboardTone = "neutral" | "info" | "warning" | "success" | "danger";
export type DashboardTaskStatus = "todo" | "in-progress" | "done";

export type DashboardTaskView = {
  id: string;
  title: ReactNode;
  status: DashboardTaskStatus;
  tone: DashboardTone;
};

export type DashboardActivityView = {
  id: string;
  label: ReactNode;
  body: ReactNode;
  tone: DashboardTone;
  createdAt: string;
};

export function OverviewPageView({
  title,
  activeLine,
  contextLine,
  experimentCount,
  maxExperiments,
  experimentBudgetBar,
  hypothesisCount,
  evaluationCount,
  tasks,
  activities,
}: {
  title?: ReactNode;
  activeLine: ReactNode;
  contextLine: ReactNode;
  experimentCount: number;
  maxExperiments: number;
  experimentBudgetBar: ReactNode;
  hypothesisCount: number;
  evaluationCount: number;
  tasks: DashboardTaskView[];
  activities: DashboardActivityView[];
}) {
  return (
    <>
      <section className={s.dashboardSection}>
        {title && (
          <h2 className={s.dashboardHeaderTitle}>
            <MarkdownText value={title} variant="inline" />
          </h2>
        )}
        <MarkdownText value={activeLine} variant="inline" className={s.dashboardHeaderActive} />
        <MarkdownText value={contextLine} variant="inline" className={s.dashboardHeaderContext} />
      </section>

      <section className={s.dashboardSection}>
        <span className={s.dashboardSectionLabel}>counts</span>
        <div className={s.dashboardCounts}>
          <span className={s.dashboardCount}>
            <span className={s.dashboardCountLabel}>experiments</span>
            <span>
              {experimentCount}/{maxExperiments}
            </span>
            <span className={s.dashboardCountBudgetBar}>{experimentBudgetBar}</span>
          </span>
          <span className={s.dashboardCount}>
            <span className={s.dashboardCountLabel}>hypotheses</span>
            <span>{hypothesisCount}</span>
          </span>
          <span className={s.dashboardCount}>
            <span className={s.dashboardCountLabel}>evaluations</span>
            <span>{evaluationCount}</span>
          </span>
        </div>
      </section>

      <TaskBoard tasks={tasks} />
      <DashboardActivity activities={activities} />
    </>
  );
}

function TaskBoard({ tasks }: { tasks: DashboardTaskView[] }) {
  const todo = tasks.filter((task) => task.status === "todo");
  const inProgress = tasks.filter((task) => task.status === "in-progress");
  const done = tasks.filter((task) => task.status === "done");

  return (
    <section className={s.dashboardSection}>
      <span className={s.dashboardSectionLabel}>tasks</span>
      <div className={s.taskLegend} aria-label="Task legend">
        <span className={s.taskLegendItem} data-tone="neutral">
          <span className={s.taskLegendGlyph}>•</span>
          normal
        </span>
        <span className={s.taskLegendItem} data-tone="warning">
          <span className={s.taskLegendGlyph}>•</span>
          high priority
        </span>
        <span className={s.taskLegendItem} data-tone="success">
          <span className={s.taskLegendGlyph}>+</span>
          done
        </span>
        <span className={s.taskLegendItem} data-tone="danger">
          <span className={s.taskLegendGlyph}>+</span>
          failed/canceled
        </span>
      </div>
      <div className={s.taskBoard}>
        <TaskColumn title="TODO" tasks={todo} />
        <TaskColumn title="IN PROGRESS" tasks={inProgress} />
        <TaskColumn title="DONE" tasks={done} />
      </div>
    </section>
  );
}

function TaskColumn({ title, tasks }: { title: string; tasks: DashboardTaskView[] }) {
  return (
    <div className={s.taskColumn}>
      <h3 className={s.taskColumnTitle}>{title}</h3>
      {tasks.length === 0 && <p className={s.taskColumnEmpty}>No tasks</p>}
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </div>
  );
}

function TaskRow({ task }: { task: DashboardTaskView }) {
  return (
    <div className={s.taskRow} data-tone={task.tone}>
      <span className={s.taskRowGlyph}>{glyphForTask({ task })}</span>
      <MarkdownText value={task.title} variant="inline" className={s.taskRowTitle} />
    </div>
  );
}

function DashboardActivity({ activities }: { activities: DashboardActivityView[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const rows = useMemo(() => [...activities].reverse(), [activities]);

  useEffect(() => {
    const list = listRef.current;

    if (!list) {
      return;
    }

    list.scrollTop = list.scrollHeight;
  }, [rows]);

  return (
    <section className={s.dashboardSection}>
      <span className={s.dashboardSectionLabel}>activity</span>
      {activities.length === 0 ? (
        <p className={s.dashboardEmpty}>No activity yet</p>
      ) : (
        <ul className={s.dashboardActivityList} ref={listRef}>
          {rows.map((row) => (
            <li className={s.dashboardActivityRow} key={row.id}>
              <span className={`${s.dashboardActivityLabel} ${mono}`} data-tone={row.tone}>
                <time
                  className={s.dashboardActivityTime}
                  dateTime={row.createdAt}
                  title={row.createdAt}
                >
                  [{shortActivityTime({ value: row.createdAt })}]
                </time>
                {row.label}
              </span>
              <MarkdownText
                value={row.body}
                variant="inline"
                className={s.dashboardActivityBody}
                dataTone={row.tone}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function glyphForTask({ task }: { task: DashboardTaskView }): string {
  if (task.status === "done") return "+";
  return "•";
}

function shortActivityTime({ value }: { value: string }): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

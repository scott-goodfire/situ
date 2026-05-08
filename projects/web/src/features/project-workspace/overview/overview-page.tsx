import { OverviewPageView } from "@situ/web-app-ui";
import type { ProjectRecord, SessionRecord } from "@situ/protocol";
import {
  DEFAULT_MAX_EXPERIMENTS,
  activityFeed,
  dashboardTasks,
  experimentBudgetBar,
  lastActivityLabel,
} from "../../../selectors/dashboard";
import type { ProjectWorkspaceData } from "../types";

const MAX_ACTIVITY_ROWS = 18;

export function OverviewPage({ data }: { data: ProjectWorkspaceData }) {
  const activeSession = data.sessions.find((session) => session.status === "active");

  return (
    <OverviewPageView
      title={data.project?.title}
      activeLine={activeLine({
        project: data.project,
        session: activeSession,
        lastActivityLabel: lastActivityLabel({ data }),
      })}
      contextLine={contextLine({
        workspace: data.workspace,
        project: data.project,
        session: activeSession,
      })}
      experimentCount={data.experiments.length}
      maxExperiments={DEFAULT_MAX_EXPERIMENTS}
      experimentBudgetBar={experimentBudgetBar({
        current: data.experiments.length,
        total: DEFAULT_MAX_EXPERIMENTS,
      })}
      hypothesisCount={data.hypotheses.length}
      evaluationCount={data.evaluations.length}
      tasks={dashboardTasks({ data })}
      activities={activityFeed({ data, maxRows: MAX_ACTIVITY_ROWS })}
    />
  );
}

function activeLine({
  project,
  session,
  lastActivityLabel: latestLabel,
}: {
  project: ProjectRecord | undefined;
  session: SessionRecord | undefined;
  lastActivityLabel: string | undefined;
}) {
  const sessionState = session ? `${session.status} session` : "no session";
  const objective = project?.objective ?? "No active objective";
  const activeLineSuffix = latestLabel ? ` / ${latestLabel}` : "";
  return `${sessionState} / ${objective}${activeLineSuffix}`;
}

function contextLine({
  workspace,
  project,
  session,
}: {
  workspace: string | undefined;
  project: ProjectRecord | undefined;
  session: SessionRecord | undefined;
}) {
  const researchContext = project?.research_context || "No research context";
  const sessionContext = session ? session.id : "Waiting for a session";
  return `${workspace ?? "-"} / ${sessionContext} / ${researchContext}`;
}

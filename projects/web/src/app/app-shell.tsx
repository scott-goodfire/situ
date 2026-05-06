import {
  DxAppFrame,
  DxSidebar,
  DxSidebarItem,
  DxSidebarSection,
} from "@situ/web-ui";
import { Link, useMatchRoute } from "@tanstack/react-router";
import {
  Activity,
  Beaker,
  FileText,
  FlaskConical,
  ListChecks,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  ConnectionBadge,
  type ConnectionState,
} from "../features/run-monitor/connection-badge";
import * as s from "./app-shell.css";

export type AppShellProject = {
  projectId: string;
  workspace: string | undefined;
  connection: ConnectionState;
};

export function AppShell({
  project,
  topBarActions,
  children,
}: {
  project?: AppShellProject;
  topBarActions?: ReactNode;
  children: ReactNode;
}) {
  const showTopBar = project !== undefined || topBarActions !== undefined;

  return (
    <DxAppFrame
      sidebar={
        <DxSidebar
          header={<SidebarHeader workspace={project?.workspace} />}
          footer={<SidebarFooter />}
        >
          {project && <ProjectNavSection projectId={project.projectId} />}
        </DxSidebar>
      }
      topBar={
        showTopBar ? (
          <>
            <div />
            <div className={s.topBarActions}>
              {project && <ConnectionBadge state={project.connection} />}
              {topBarActions}
            </div>
          </>
        ) : undefined
      }
    >
      {children}
    </DxAppFrame>
  );
}

function SidebarHeader({ workspace }: { workspace: string | undefined }) {
  return (
    <div className={s.sidebarHeader}>
      <span className={s.sidebarBrand}>Situ</span>
      <span className={s.sidebarWorkspace}>{workspace ?? "Local workspace"}</span>
    </div>
  );
}

function SidebarFooter() {
  return <span className={s.sidebarFooter}>v0.0.1</span>;
}

function ProjectNavSection({ projectId }: { projectId: string }) {
  const matchRoute = useMatchRoute();
  const params = { projectId };

  return (
    <DxSidebarSection title="Project">
      <DxSidebarItem
        icon={<FileText size={14} />}
        label="Overview"
        active={matchRoute({ to: "/projects/$projectId", params, fuzzy: false }) !== false}
        render={<Link to="/projects/$projectId" params={params} />}
      />
      <DxSidebarItem
        icon={<Beaker size={14} />}
        label="Hypotheses"
        active={matchRoute({ to: "/projects/$projectId/hypotheses", params, fuzzy: true }) !== false}
        render={<Link to="/projects/$projectId/hypotheses" params={params} />}
      />
      <DxSidebarItem
        icon={<FlaskConical size={14} />}
        label="Experiments"
        active={matchRoute({ to: "/projects/$projectId/experiments", params, fuzzy: true }) !== false}
        render={<Link to="/projects/$projectId/experiments" params={params} />}
      />
      <DxSidebarItem
        icon={<ListChecks size={14} />}
        label="Evaluations"
        active={matchRoute({ to: "/projects/$projectId/evaluations", params, fuzzy: true }) !== false}
        render={<Link to="/projects/$projectId/evaluations" params={params} />}
      />
      <DxSidebarItem
        icon={<Users size={14} />}
        label="Agents"
        active={matchRoute({ to: "/projects/$projectId/agents", params, fuzzy: true }) !== false}
        render={<Link to="/projects/$projectId/agents" params={params} />}
      />
      <DxSidebarItem
        icon={<Activity size={14} />}
        label="Events"
        active={matchRoute({ to: "/projects/$projectId/events", params, fuzzy: true }) !== false}
        render={<Link to="/projects/$projectId/events" params={params} />}
      />
    </DxSidebarSection>
  );
}

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
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
    <div style={{ display: "grid", gap: 2 }}>
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--foreground)",
        }}
      >
        Situ
      </span>
      <span
        style={{
          fontSize: 11,
          color: "var(--muted-foreground-tertiary)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {workspace ?? "Local workspace"}
      </span>
    </div>
  );
}

function SidebarFooter() {
  return (
    <span
      style={{
        fontSize: 11,
        color: "var(--muted-foreground-tertiary)",
      }}
    >
      v0.0.1
    </span>
  );
}

function ProjectNavSection({ projectId }: { projectId: string }) {
  const matchRoute = useMatchRoute();
  const params = { projectId };
  const isActive = (path: string, exact: boolean): boolean => {
    return matchRoute({ to: path, params, fuzzy: !exact } as never) !== false;
  };

  return (
    <DxSidebarSection title="Project">
      <DxSidebarItem
        icon={<FileText size={14} />}
        label="Overview"
        active={isActive("/projects/$projectId", true)}
        render={<Link to="/projects/$projectId" params={params} />}
      />
      <DxSidebarItem
        icon={<Beaker size={14} />}
        label="Hypotheses"
        active={isActive("/projects/$projectId/hypotheses", false)}
        render={<Link to="/projects/$projectId/hypotheses" params={params} />}
      />
      <DxSidebarItem
        icon={<FlaskConical size={14} />}
        label="Experiments"
        active={isActive("/projects/$projectId/experiments", false)}
        render={<Link to="/projects/$projectId/experiments" params={params} />}
      />
      <DxSidebarItem
        icon={<ListChecks size={14} />}
        label="Evaluations"
        active={isActive("/projects/$projectId/evaluations", false)}
        render={<Link to="/projects/$projectId/evaluations" params={params} />}
      />
      <DxSidebarItem
        icon={<Users size={14} />}
        label="Agents"
        active={isActive("/projects/$projectId/agents", false)}
        render={<Link to="/projects/$projectId/agents" params={params} />}
      />
      <DxSidebarItem
        icon={<Activity size={14} />}
        label="Events"
        active={isActive("/projects/$projectId/events", false)}
        render={<Link to="/projects/$projectId/events" params={params} />}
      />
    </DxSidebarSection>
  );
}

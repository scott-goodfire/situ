import {
  ConnectionBadge,
  SituShell,
  type ConnectionState,
  type SituShellNavItem,
} from "@situ/web-app-ui";
import { Link, useMatchRoute } from "@tanstack/react-router";
import {
  Activity,
  Beaker,
  BookOpen,
  CheckSquare,
  FileText,
  FlaskConical,
  GitBranch,
  ListChecks,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { CommandPaletteHintButton } from "../features/command-palette/command-palette";
import * as s from "./app-shell.css";

export type AppShellProject = {
  projectId?: string;
  workspaceId: string;
  workspace: string | undefined;
  connection: ConnectionState;
};

export function AppShell({
  project,
  commandPaletteEnabled = false,
  topBarActions,
  children,
}: {
  project?: AppShellProject;
  commandPaletteEnabled?: boolean;
  topBarActions?: ReactNode;
  children: ReactNode;
}) {
  const navItems = useProjectNavItems({
    projectId: project?.projectId,
    workspaceId: project?.workspaceId,
  });

  return (
    <SituShell
      workspace={project?.workspace}
      workspaceLink={project ? <Link to="/" /> : undefined}
      navItems={project ? navItems : []}
      footer={
        project && commandPaletteEnabled ? (
          <SidebarFooterWithSearch />
        ) : (
          <span className={s.sidebarFooter}>v0.0.1</span>
        )
      }
      topBarActions={
        project || topBarActions ? (
          <>
            {project && <ConnectionBadge state={project.connection} />}
            {topBarActions}
          </>
        ) : undefined
      }
    >
      {children}
    </SituShell>
  );
}

function SidebarFooterWithSearch() {
  return (
    <div className={s.sidebarFooterRow}>
      <CommandPaletteHintButton />
      <span className={s.sidebarFooterVersion}>v0.0.1</span>
    </div>
  );
}

function useProjectNavItems({
  projectId,
  workspaceId,
}: {
  projectId: string | undefined;
  workspaceId: string | undefined;
}): SituShellNavItem[] {
  const matchRoute = useMatchRoute();
  if (!projectId || !workspaceId) return [];

  const params = { workspaceId, projectId };

  return [
    {
      id: "overview",
      label: "Overview",
      icon: <FileText size={14} />,
      active:
        matchRoute({
          to: "/workspaces/$workspaceId/projects/$projectId",
          params,
          fuzzy: false,
        }) !== false,
      render: <Link to="/workspaces/$workspaceId/projects/$projectId" params={params} />,
    },
    {
      id: "analyses",
      label: "Analyses",
      icon: <BookOpen size={14} />,
      active:
        matchRoute({
          to: "/workspaces/$workspaceId/projects/$projectId/analyses",
          params,
          fuzzy: true,
        }) !== false,
      render: (
        <Link to="/workspaces/$workspaceId/projects/$projectId/analyses" params={params} />
      ),
    },
    {
      id: "hypotheses",
      label: "Hypotheses",
      icon: <Beaker size={14} />,
      active:
        matchRoute({
          to: "/workspaces/$workspaceId/projects/$projectId/hypotheses",
          params,
          fuzzy: true,
        }) !== false,
      render: (
        <Link to="/workspaces/$workspaceId/projects/$projectId/hypotheses" params={params} />
      ),
    },
    {
      id: "experiments",
      label: "Experiments",
      icon: <FlaskConical size={14} />,
      active:
        matchRoute({
          to: "/workspaces/$workspaceId/projects/$projectId/experiments",
          params,
          fuzzy: true,
        }) !== false,
      render: (
        <Link to="/workspaces/$workspaceId/projects/$projectId/experiments" params={params} />
      ),
    },
    {
      id: "trajectory",
      label: "Trajectory",
      icon: <GitBranch size={14} />,
      active:
        matchRoute({
          to: "/workspaces/$workspaceId/projects/$projectId/trajectory",
          params,
          fuzzy: true,
        }) !== false,
      render: (
        <Link
          to="/workspaces/$workspaceId/projects/$projectId/trajectory"
          params={params}
          search={{ experimentId: undefined }}
        />
      ),
    },
    {
      id: "evaluations",
      label: "Evaluations",
      icon: <ListChecks size={14} />,
      active:
        matchRoute({
          to: "/workspaces/$workspaceId/projects/$projectId/evaluations",
          params,
          fuzzy: true,
        }) !== false,
      render: (
        <Link to="/workspaces/$workspaceId/projects/$projectId/evaluations" params={params} />
      ),
    },
    {
      id: "tasks",
      label: "Tasks",
      icon: <CheckSquare size={14} />,
      active:
        matchRoute({
          to: "/workspaces/$workspaceId/projects/$projectId/tasks",
          params,
          fuzzy: true,
        }) !== false,
      render: <Link to="/workspaces/$workspaceId/projects/$projectId/tasks" params={params} />,
    },
    {
      id: "agents",
      label: "Agents",
      icon: <Users size={14} />,
      active:
        matchRoute({
          to: "/workspaces/$workspaceId/projects/$projectId/agents",
          params,
          fuzzy: true,
        }) !== false,
      render: <Link to="/workspaces/$workspaceId/projects/$projectId/agents" params={params} />,
    },
    {
      id: "events",
      label: "Events",
      icon: <Activity size={14} />,
      active:
        matchRoute({
          to: "/workspaces/$workspaceId/projects/$projectId/events",
          params,
          fuzzy: true,
        }) !== false,
      render: <Link to="/workspaces/$workspaceId/projects/$projectId/events" params={params} />,
    },
  ];
}

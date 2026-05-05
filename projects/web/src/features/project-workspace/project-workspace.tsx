import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ConnectionBadge } from "../run-monitor/connection-badge";
import type { ProjectWorkspaceData } from "./types";

export function ProjectWorkspaceLayout({
  data,
  discoveryError,
  children,
}: {
  data: ProjectWorkspaceData;
  discoveryError: string | undefined;
  children: ReactNode;
}) {
  return (
    <main className="almanac-shell">
      <header className="almanac-topbar">
        <div>
          <h1>Almanac</h1>
          <p>{data.workspace ?? "Local workspace"}</p>
        </div>
        <ConnectionBadge state={data.connection} />
      </header>

      <ProjectNav projectId={data.projectId} />

      {data.connection.kind === "failed" && (
        <p className="almanac-status" data-tone="danger">{data.connection.message}</p>
      )}

      {data.connection.kind === "disconnected" && (
        <p className="almanac-status" data-tone="warning">{data.connection.message}</p>
      )}

      {discoveryError && (
        <p className="almanac-status" data-tone="warning">{discoveryError}</p>
      )}

      {children}
    </main>
  );
}

function ProjectNav({
  projectId,
}: {
  projectId: string;
}) {
  return (
    <nav className="almanac-project-nav" aria-label="Project sections">
      <Link
        className="almanac-project-nav__link"
        to="/projects/$projectId"
        params={{ projectId }}
        activeOptions={{ exact: true }}
        activeProps={{ "data-active": "true" }}
        inactiveProps={{ "data-active": "false" }}
      >
        Overview
      </Link>
      <Link
        className="almanac-project-nav__link"
        to="/projects/$projectId/hypotheses"
        params={{ projectId }}
        activeProps={{ "data-active": "true" }}
        inactiveProps={{ "data-active": "false" }}
      >
        Hypotheses
      </Link>
      <Link
        className="almanac-project-nav__link"
        to="/projects/$projectId/experiments"
        params={{ projectId }}
        activeProps={{ "data-active": "true" }}
        inactiveProps={{ "data-active": "false" }}
      >
        Experiments
      </Link>
      <Link
        className="almanac-project-nav__link"
        to="/projects/$projectId/evaluations"
        params={{ projectId }}
        activeProps={{ "data-active": "true" }}
        inactiveProps={{ "data-active": "false" }}
      >
        Evaluations
      </Link>
      <Link
        className="almanac-project-nav__link"
        to="/projects/$projectId/agents"
        params={{ projectId }}
        activeProps={{ "data-active": "true" }}
        inactiveProps={{ "data-active": "false" }}
      >
        Agents
      </Link>
      <Link
        className="almanac-project-nav__link"
        to="/projects/$projectId/events"
        params={{ projectId }}
        activeProps={{ "data-active": "true" }}
        inactiveProps={{ "data-active": "false" }}
      >
        Events
      </Link>
    </nav>
  );
}

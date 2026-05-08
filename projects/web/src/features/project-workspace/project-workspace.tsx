import type { ReactNode } from "react";
import { AppShell } from "../../app/app-shell";
import * as s from "../../styles.css";
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
    <AppShell
      commandPaletteEnabled
      project={{
        projectId: data.activeProjectRecordId,
        workspaceId: data.workspaceId,
        workspace: data.workspace,
        connection: data.connection,
      }}
    >
      <ConnectionStatusBanner connection={data.connection} />
      {discoveryError && <StatusBanner tone="warning">{discoveryError}</StatusBanner>}
      {children}
    </AppShell>
  );
}

function ConnectionStatusBanner({
  connection,
}: {
  connection: ProjectWorkspaceData["connection"];
}) {
  if (connection.kind === "failed") {
    return <StatusBanner tone="danger">{connection.message}</StatusBanner>;
  }

  if (connection.kind === "disconnected") {
    return <StatusBanner tone="warning">{connection.message}</StatusBanner>;
  }

  return null;
}

function StatusBanner({
  tone,
  children,
}: {
  tone: "warning" | "danger";
  children: ReactNode;
}) {
  return (
    <p className={s.status} data-tone={tone}>
      {children}
    </p>
  );
}

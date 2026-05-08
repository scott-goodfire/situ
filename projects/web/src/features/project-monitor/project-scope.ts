import type { ProjectRecord, SessionRecord } from "@situ/protocol";

export function currentProjectRecordId({
  projects,
  selectedProjectId,
  sessionStartedAt,
  sessions,
  workspaceId,
}: {
  projects: ProjectRecord[];
  selectedProjectId?: string;
  sessionStartedAt?: string;
  sessions: SessionRecord[];
  workspaceId: string;
}): string | undefined {
  if (selectedProjectId) {
    const routeProject = projects.find((record) => record.id === selectedProjectId);
    if (routeProject) {
      return routeProject.id;
    }

    const routeSession = reverseRecords({ records: sessions }).find(
      (record) => record.project_id === selectedProjectId,
    );
    if (routeSession?.project_id) {
      return routeSession.project_id;
    }
  }

  const connectedSessionProjectId = projectIdForConnectedSession({
    sessionStartedAt,
    sessions,
    workspaceId,
  });
  if (connectedSessionProjectId) {
    return connectedSessionProjectId;
  }

  const activeSession = reverseRecords({ records: sessions }).find(
    (record) =>
      record.workspace_id === workspaceId &&
      record.status === "active" &&
      record.project_id,
  );
  if (activeSession?.project_id) {
    return activeSession.project_id;
  }

  const latestSession = reverseRecords({ records: sessions }).find(
    (record) => record.workspace_id === workspaceId && record.project_id,
  );
  if (latestSession?.project_id) {
    return latestSession.project_id;
  }

  const activeProject = reverseRecords({ records: projects }).find(
    (record) => record.workspace_id === workspaceId && record.status === "active",
  );
  if (activeProject) {
    return activeProject.id;
  }

  return reverseRecords({ records: projects }).find(
    (record) => record.workspace_id === workspaceId,
  )?.id;
}

function projectIdForConnectedSession({
  sessionStartedAt,
  sessions,
  workspaceId,
}: {
  sessionStartedAt: string | undefined;
  sessions: SessionRecord[];
  workspaceId: string;
}): string | undefined {
  if (!sessionStartedAt) {
    return undefined;
  }

  const connectionStartedMillis = timestampMillis({ value: sessionStartedAt });
  if (connectionStartedMillis === undefined) {
    return undefined;
  }

  return sessions
    .filter(
      (record): record is SessionRecord & { project_id: string } =>
        record.workspace_id === workspaceId && typeof record.project_id === "string",
    )
    .map((record) => ({
      record,
      distance: Math.abs(
        (timestampMillis({ value: record.created_at }) ?? Number.POSITIVE_INFINITY) -
          connectionStartedMillis,
      ),
    }))
    .sort((left, right) => left.distance - right.distance)
    .at(0)?.record.project_id;
}

function timestampMillis({ value }: { value: string }): number | undefined {
  const millis = Date.parse(value);
  return Number.isNaN(millis) ? undefined : millis;
}

function reverseRecords<RecordType>({
  records,
}: {
  records: RecordType[];
}): RecordType[] {
  return [...records].reverse();
}

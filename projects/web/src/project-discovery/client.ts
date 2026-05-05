import type {
  ProjectListResponse,
  ProjectResponse,
  ProjectSessionResponse,
  ProjectSnapshotResponse,
} from "./types";

export async function fetchProjects(): Promise<ProjectListResponse> {
  return readJson<ProjectListResponse>({
    path: "/api/projects",
  });
}

export async function fetchProject({
  projectId,
}: {
  projectId: string;
}): Promise<ProjectResponse> {
  return readJson<ProjectResponse>({
    path: `/api/projects/${encodeURIComponent(projectId)}`,
    allowNotFound: true,
  });
}

export async function fetchProjectSession({
  projectId,
}: {
  projectId: string;
}): Promise<ProjectSessionResponse> {
  return readJson<ProjectSessionResponse>({
    path: `/api/projects/${encodeURIComponent(projectId)}/session`,
    allowNotFound: true,
  });
}

export async function fetchProjectSnapshot({
  projectId,
}: {
  projectId: string;
}): Promise<ProjectSnapshotResponse> {
  return readJson<ProjectSnapshotResponse>({
    path: `/api/projects/${encodeURIComponent(projectId)}/snapshot`,
    allowNotFound: true,
  });
}

async function readJson<ResponseBody>({
  path,
  allowNotFound = false,
}: {
  path: string;
  allowNotFound?: boolean;
}): Promise<ResponseBody> {
  const response = await fetch(path, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok && !(allowNotFound && response.status === 404)) {
    throw new Error(`${path} failed with HTTP ${response.status}`);
  }

  return (await response.json()) as ResponseBody;
}

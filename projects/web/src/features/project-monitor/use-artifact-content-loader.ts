import { useMemo } from "react";
import { HttpJsonRpcClient } from "@situ/rpc-client/http";
import type { ArtifactReadParams, ArtifactReadResult } from "@situ/protocol";
import type { SessionConnection } from "../../project-discovery/types";

export type ArtifactContentLoader = ({
  artifactId,
}: {
  artifactId: string;
}) => Promise<ArtifactReadResult>;

export function useArtifactContentLoader({
  session,
}: {
  session: SessionConnection | null;
}): ArtifactContentLoader | undefined {
  return useMemo(() => {
    if (!session) return undefined;
    const client = new HttpJsonRpcClient({
      baseUrl: window.location.origin,
      workspace: session.workspace,
      projectId: session.project_id,
    });
    return ({ artifactId }) =>
      client.request<ArtifactReadResult, ArtifactReadParams>({
        method: "artifacts.read",
        params: { artifact_id: artifactId },
      });
  }, [session?.workspace, session?.project_id]);
}

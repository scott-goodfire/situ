import { PatchDiff } from "@pierre/diffs/react";
import type { ArtifactReadResult, ArtifactRecord } from "@situ/protocol";
import { useEffect, useMemo, useState } from "react";
import { splitFilePatches } from "./diff-normalize";
import * as s from "./trajectory-diff-pane.css";

export type PatchArtifact = Pick<
  ArtifactRecord,
  "id" | "title" | "path" | "media_type" | "size_bytes"
>;

export type LoadArtifactContent = ({
  artifactId,
}: {
  artifactId: string;
}) => Promise<ArtifactReadResult>;

type DiffState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; result: ArtifactReadResult }
  | { kind: "error"; message: string };

export function TrajectoryDiffPane({
  patchArtifact,
  loadArtifactContent,
}: {
  patchArtifact: PatchArtifact | undefined;
  loadArtifactContent: LoadArtifactContent | undefined;
}) {
  const [state, setState] = useState<DiffState>({ kind: "idle" });

  useEffect(() => {
    if (!patchArtifact || !loadArtifactContent) {
      setState({ kind: "idle" });
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });
    loadArtifactContent({ artifactId: patchArtifact.id })
      .then((result) => {
        if (!cancelled) setState({ kind: "ready", result });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ kind: "error", message: errorMessage({ error }) });
      });
    return () => {
      cancelled = true;
    };
  }, [patchArtifact?.id, loadArtifactContent]);

  if (!patchArtifact) {
    return (
      <div className={s.placeholder}>
        No patch artifact captured for this experiment.
      </div>
    );
  }

  if (!loadArtifactContent) {
    return (
      <div className={s.placeholder}>
        Artifact content loader is not configured for this view.
      </div>
    );
  }

  if (state.kind === "idle" || state.kind === "loading") {
    return <div className={s.placeholder}>Loading patch...</div>;
  }

  if (state.kind === "error") {
    return <div className={s.error}>Could not load patch artifact: {state.message}</div>;
  }

  const { result } = state;
  if (!result.content.trim()) {
    return <div className={s.placeholder}>Patch artifact {patchArtifact.id} is empty.</div>;
  }

  return (
    <div className={s.host}>
      <div className={s.summary}>
        <span className={s.summaryLabel}>patch</span>
        <span className={s.summaryShas}>{patchArtifact.id}</span>
        <span className={s.summaryPath}>{patchArtifact.path}</span>
      </div>
      {result.truncated && (
        <div className={s.truncationNotice}>
          Patch truncated at {formatBytes({ bytes: result.truncated_at_bytes })};
          showing leading files only.
        </div>
      )}
      <DiffFiles diff={result.content} />
    </div>
  );
}

function DiffFiles({ diff }: { diff: string }) {
  const filePatches = useMemo(() => splitFilePatches({ diff }), [diff]);
  if (filePatches.length === 0) {
    return <div className={s.placeholder}>No file changes detected.</div>;
  }
  return (
    <div className={s.fileList}>
      {filePatches.map((patch, index) => (
        <div className={s.diffWrap} key={index}>
          <PatchDiff patch={patch} disableWorkerPool />
        </div>
      ))}
    </div>
  );
}

function formatBytes({ bytes }: { bytes: number | null | undefined }): string {
  if (bytes == null) return "limit";
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} kB`;
  return `${bytes} B`;
}

function errorMessage({ error }: { error: unknown }): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

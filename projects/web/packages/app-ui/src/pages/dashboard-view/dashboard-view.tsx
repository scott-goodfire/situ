import type { Timestamp } from "@situ/protocol";
import { DxBadge } from "@situ/web-ui";
import { DateTime } from "luxon";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import type { BuildResearchMapModelInput } from "../research-map-view/research-map-model";
import { ResearchMapView } from "../research-map-view";
import { researchProjectStatusTone } from "../../__shared__";
import { researchProjectStatusLabel } from "./status-label";
import * as s from "./dashboard-view.css";

const TERMINAL_PROJECT_STATUSES = new Set(["complete", "failed", "canceled"]);

export type DashboardViewProps = {
  input: BuildResearchMapModelInput;
  /** Wall-clock timestamp the page is rendering at. Drives the live elapsed-time chip. */
  now?: Timestamp;
  /** Custom node for the "Project" navigation link (e.g. wraps a router Link). */
  projectLink?: ReactNode;
  onSelectExperiment?: (input: { experimentId: string; researchTaskId: string | null }) => void;
};

export function DashboardView({ input, now, projectLink, onSelectExperiment }: DashboardViewProps) {
  const project = input.project;
  const status = project?.status;
  const elapsed = project ? formatElapsed({ project, now }) : undefined;
  return (
    <div className={s.dashboard}>
      <div className={s.headerStrip}>
        <div className={s.headerLeft}>
          <h1 className={s.headerTitle}>{project?.title ?? "Research Map"}</h1>
          {status ? (
            <DxBadge tone={researchProjectStatusTone({ status })}>
              {researchProjectStatusLabel({ status })}
            </DxBadge>
          ) : null}
        </div>
        <div className={s.headerRight}>
          {elapsed ? (
            <span className={s.elapsedChip} aria-label="Elapsed since run started">
              {elapsed}
            </span>
          ) : null}
          {projectLink ?? (
            <a className={s.projectLink} href="/project">
              Project <ArrowUpRight size={12} />
            </a>
          )}
        </div>
      </div>
      <div className={s.mapArea}>
        <ResearchMapView input={input} fullBleed onSelectExperiment={onSelectExperiment} />
      </div>
    </div>
  );
}

function formatElapsed({
  project,
  now,
}: {
  project: NonNullable<BuildResearchMapModelInput["project"]>;
  now: Timestamp | undefined;
}): string | undefined {
  const startMs = DateTime.fromISO(project.createdAt).toMillis();
  if (!Number.isFinite(startMs)) return undefined;
  const endIso = TERMINAL_PROJECT_STATUSES.has(project.status)
    ? project.updatedAt
    : (now ?? new Date().toISOString());
  const endMs = DateTime.fromISO(endIso).toMillis();
  if (!Number.isFinite(endMs)) return undefined;
  const totalSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const hms = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return days > 0 ? `${days}d ${hms}` : hms;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

import { DxBadge } from "@situ/web-ui";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import type { BuildResearchMapModelInput } from "../research-map-view/research-map-model";
import { ResearchMapView } from "../research-map-view";
import { researchProjectStatusTone } from "../../__shared__";
import { researchProjectStatusLabel } from "./status-label";
import * as s from "./dashboard-view.css";

export type DashboardViewProps = {
  input: BuildResearchMapModelInput;
  /** Custom node for the "Project" navigation link (e.g. wraps a router Link). */
  projectLink?: ReactNode;
  onSelectExperiment?: (input: { experimentId: string; researchTaskId: string | null }) => void;
};

export function DashboardView({ input, projectLink, onSelectExperiment }: DashboardViewProps) {
  const project = input.project;
  const status = project?.status;
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
        {projectLink ?? (
          <a className={s.projectLink} href="/project">
            Project <ArrowUpRight size={12} />
          </a>
        )}
      </div>
      <div className={s.mapArea}>
        <ResearchMapView input={input} fullBleed onSelectExperiment={onSelectExperiment} />
      </div>
    </div>
  );
}

import type { ProjectRecord } from "@situ/protocol";
import { DxBadge } from "@situ/web-ui";
import * as s from "../../../styles.css";
import { overviewHypotheses } from "../../../selectors/hypotheses";
import { HypothesisCycle } from "./hypothesis-cycle";
import type { ProjectWorkspaceData } from "../types";

export function OverviewPage({ data }: { data: ProjectWorkspaceData }) {
  const visibleHypotheses = overviewHypotheses({ data });

  return (
    <>
      {data.project && <ProjectHeader project={data.project} />}
      <HypothesisCycle data={data} hypotheses={visibleHypotheses} />
    </>
  );
}

function ProjectHeader({ project }: { project: ProjectRecord }) {
  return (
    <section className={s.objectPage}>
      <div className={s.objectPageHeader}>
        <div>
          <p className={s.objectPageEyebrow}>{project.id}</p>
          <h2>{project.title}</h2>
        </div>
        <DxBadge tone={project.status === "active" ? "success" : "neutral"}>
          {project.status}
        </DxBadge>
      </div>
      {project.objective && <p className={s.objectPageSummary}>{project.objective}</p>}
      {project.research_context && (
        <p className={s.objectPageSummary}>{project.research_context}</p>
      )}
    </section>
  );
}

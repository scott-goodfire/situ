import type { ResearchProjectRecord } from "@situ/protocol";
import { DashboardView, dashboardProjectLinkClass } from "@situ/web-app-ui";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useEntityLinks } from "../../hooks/entity-links";
import { useEvaluations } from "../../hooks/evaluations";
import { useExperiments } from "../../hooks/experiments";
import { useHypotheses } from "../../hooks/hypotheses";
import { useMeasurements } from "../../hooks/measurements";
import {
  useResearchProjects,
  useResearchTaskVerifications,
  useResearchTasks,
} from "../../hooks/research-projects";
import { useNow } from "../../hooks/use-now";
import { researchProjectAdapters, researchProjectModule } from "../../modules/research-project";

export function DashboardPage({
  researchProjects: initialResearchProjects,
}: {
  researchProjects?: ResearchProjectRecord[];
} = {}) {
  const subscribedResearchProjects = useResearchProjects();
  const researchProjects = initialResearchProjects ?? subscribedResearchProjects;
  const researchTasks = useResearchTasks();
  const researchTaskVerifications = useResearchTaskVerifications();
  const hypotheses = useHypotheses();
  const experiments = useExperiments();
  const entityLinks = useEntityLinks();
  const measurements = useMeasurements();
  const evaluations = useEvaluations();

  const project = researchProjectModule.currentResearchProjectFrom({ researchProjects });
  const uiProject = project ? researchProjectAdapters.toProject({ project }) : undefined;
  const now = useNow();

  return (
    <DashboardView
      input={{
        project: uiProject,
        hypotheses,
        experiments,
        entityLinks,
        researchTasks: researchTasks.map((researchTask) =>
          researchProjectAdapters.toResearchTask({ researchTask }),
        ),
        verifications: researchTaskVerifications.map((verification) =>
          researchProjectAdapters.toVerification({ verification }),
        ),
        measurements,
        evaluations,
        now,
      }}
      now={now}
      onSelectExperiment={({ experimentId }) => {
        window.open(`/experiments/${experimentId}`, "_blank", "noopener,noreferrer");
      }}
      projectLink={
        <Link to="/project" className={dashboardProjectLinkClass}>
          Project <ArrowUpRight size={12} />
        </Link>
      }
    />
  );
}

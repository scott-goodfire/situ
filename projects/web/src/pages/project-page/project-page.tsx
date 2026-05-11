import { DxEmptyState, DxSpinner } from "@situ/web-ui";
import { ProjectView } from "@situ/web-app-ui";
import { ResearchProjectPage } from "../research-project-page";
import { useBaselines } from "../../hooks/baselines";
import { useEvaluations } from "../../hooks/evaluations";
import { useMeasurements } from "../../hooks/measurements";
import {
  isProjectKickedOff,
  useResearchProjectInteractions,
  useResearchProjects,
  useResearchProjectsResult,
  useResearchTaskVerifications,
  useResearchTasks,
} from "../../hooks/research-projects";
import { researchProjectAdapters, researchProjectModule } from "../../modules/research-project";

export function ProjectPage() {
  const researchProjectsResult = useResearchProjectsResult();
  const researchProjects = useResearchProjects();
  const researchTasks = useResearchTasks();
  const verifications = useResearchTaskVerifications();
  const interactions = useResearchProjectInteractions();
  const baselines = useBaselines();
  const evaluations = useEvaluations();
  const measurements = useMeasurements();

  if (researchProjectsResult.status === "loading") {
    return <DxEmptyState heading="Loading project" action={<DxSpinner size={20} />} />;
  }

  const project = researchProjectModule.currentResearchProjectFrom({ researchProjects });
  if (!project || !isProjectKickedOff({ project })) {
    return <ResearchProjectPage researchProjects={researchProjects} />;
  }

  const uiProject = researchProjectAdapters.toProject({ project });

  return (
    <ProjectView
      project={uiProject}
      researchTasks={researchTasks.map((researchTask) =>
        researchProjectAdapters.toResearchTask({ researchTask }),
      )}
      verifications={verifications.map((verification) =>
        researchProjectAdapters.toVerification({ verification }),
      )}
      interactions={interactions.map((interaction) =>
        researchProjectAdapters.toInteraction({ interaction }),
      )}
      baselines={baselines}
      evaluations={evaluations}
      measurements={measurements}
    />
  );
}

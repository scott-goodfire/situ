import { ProjectView } from "@situ/web-app-ui";
import {
  useResearchProjectInteractions,
  useResearchProjects,
  useResearchTaskVerifications,
  useResearchTasks,
} from "../../hooks/research-projects";
import { researchProjectAdapters, researchProjectModule } from "../../modules/research-project";

export function ProjectPage() {
  const researchProjects = useResearchProjects();
  const researchTasks = useResearchTasks();
  const verifications = useResearchTaskVerifications();
  const interactions = useResearchProjectInteractions();

  const project = researchProjectModule.currentResearchProjectFrom({ researchProjects });
  const uiProject = project ? researchProjectAdapters.toProject({ project }) : undefined;

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
    />
  );
}

import { Navigate, createFileRoute } from "@tanstack/react-router";
import { ResearchProjectPage } from "../pages/research-project-page";
import { useResearchProjects } from "../hooks/research-projects";
import { researchProjectModule } from "../modules/research-project";

function ResearchProjectRoute() {
  const researchProjects = useResearchProjects();
  const current = researchProjectModule.currentResearchProjectFrom({ researchProjects });
  const ready =
    current !== undefined &&
    researchProjectModule.isResearchProjectPastOnboarding({ researchProject: current });
  if (ready) {
    return <Navigate to="/" replace />;
  }
  return <ResearchProjectPage />;
}

export const Route = createFileRoute("/research-project")({
  component: ResearchProjectRoute,
});

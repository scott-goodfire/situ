import { DxEmptyState, DxSpinner } from "@situ/web-ui";
import { DashboardPage } from "../dashboard-page";
import { ResearchProjectPage } from "../research-project-page";
import { useResearchProjectsResult } from "../../hooks/research-projects";
import { researchProjectModule } from "../../modules/research-project";

export function HomePage() {
  const researchProjectsResult = useResearchProjectsResult();
  if (researchProjectsResult.status === "loading") {
    return <DxEmptyState heading="Loading project" action={<DxSpinner size={20} />} />;
  }

  const current = researchProjectModule.currentResearchProjectFrom({
    researchProjects: researchProjectsResult.records,
  });
  const ready =
    current !== undefined &&
    researchProjectModule.isResearchProjectPastOnboarding({ researchProject: current });

  if (!ready) {
    return <ResearchProjectPage researchProjects={researchProjectsResult.records} />;
  }
  return <DashboardPage researchProjects={researchProjectsResult.records} />;
}

import { ExperimentDetailView } from "@situ/web-app-ui";
import { BackLink } from "../../app/back-link";
import { useExperiment } from "../../hooks/experiments";
import { useExperimentActivities } from "../../hooks/activities";

export function ExperimentDetailPage({ id }: { id: string }) {
  return (
    <ExperimentDetailView
      experiment={useExperiment(id)}
      activities={useExperimentActivities(id)}
      back={<BackLink to="/experiments" label="All experiments" />}
    />
  );
}

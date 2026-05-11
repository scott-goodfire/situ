import { createFileRoute } from "@tanstack/react-router";
import { ExperimentDetailPage } from "../../pages/experiment-detail-page";

export const Route = createFileRoute("/experiments/$experimentId")({
  component: function ExperimentDetailRoute() {
    const { experimentId } = Route.useParams();
    return <ExperimentDetailPage id={experimentId} />;
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { BaselineDetailPage } from "../../pages/baseline-detail-page";

export const Route = createFileRoute("/baselines/$baselineId")({
  component: function BaselineDetailRoute() {
    const { baselineId } = Route.useParams();
    return <BaselineDetailPage id={baselineId} />;
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { HypothesisDetailPage } from "../../pages/hypothesis-detail-page";

export const Route = createFileRoute("/hypotheses/$hypothesisId")({
  component: function HypothesisDetailRoute() {
    const { hypothesisId } = Route.useParams();
    return <HypothesisDetailPage id={hypothesisId} />;
  },
});

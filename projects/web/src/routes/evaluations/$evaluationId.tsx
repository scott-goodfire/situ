import { createFileRoute } from "@tanstack/react-router";
import { EvaluationDetailPage } from "../../pages/evaluation-detail-page";

export const Route = createFileRoute("/evaluations/$evaluationId")({
  component: function EvaluationDetailRoute() {
    const { evaluationId } = Route.useParams();
    return <EvaluationDetailPage id={evaluationId} />;
  },
});

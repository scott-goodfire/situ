import { EvaluationDetailView } from "@situ/web-app-ui";
import { BackLink } from "../../app/back-link";
import { useEvaluation } from "../../hooks/evaluations";
import { useEvaluationActivities } from "../../hooks/activities";

export function EvaluationDetailPage({ id }: { id: string }) {
  return (
    <EvaluationDetailView
      evaluation={useEvaluation(id)}
      activities={useEvaluationActivities(id)}
      back={<BackLink to="/evaluations" label="All evaluations" />}
    />
  );
}

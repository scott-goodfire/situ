import { EvaluationsListView } from "@situ/web-app-ui";
import { useEvaluations } from "../../hooks/evaluations";

export function EvaluationsListPage() {
  return <EvaluationsListView evaluations={useEvaluations()} />;
}

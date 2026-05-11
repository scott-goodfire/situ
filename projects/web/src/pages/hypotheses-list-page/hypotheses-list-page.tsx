import { HypothesesListView } from "@situ/web-app-ui";
import { useHypotheses } from "../../hooks/hypotheses";

export function HypothesesListPage() {
  return <HypothesesListView hypotheses={useHypotheses()} />;
}

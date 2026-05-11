import { HypothesisDetailView } from "@situ/web-app-ui";
import { BackLink } from "../../app/back-link";
import { useHypothesis } from "../../hooks/hypotheses";
import { useHypothesisActivities } from "../../hooks/activities";

export function HypothesisDetailPage({ id }: { id: string }) {
  return (
    <HypothesisDetailView
      hypothesis={useHypothesis(id)}
      activities={useHypothesisActivities(id)}
      back={<BackLink to="/hypotheses" label="All hypotheses" />}
    />
  );
}

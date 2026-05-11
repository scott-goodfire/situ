import { BaselineDetailView } from "@situ/web-app-ui";
import { BackLink } from "../../app/back-link";
import { useBaseline } from "../../hooks/baselines";
import { useBaselineActivities } from "../../hooks/activities";

export function BaselineDetailPage({ id }: { id: string }) {
  return (
    <BaselineDetailView
      baseline={useBaseline(id)}
      activities={useBaselineActivities(id)}
      back={<BackLink to="/baselines" label="All baselines" />}
    />
  );
}

import { BaselinesListView } from "@situ/web-app-ui";
import { useBaselines } from "../../hooks/baselines";

export function BaselinesListPage() {
  return <BaselinesListView baselines={useBaselines()} />;
}

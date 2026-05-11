import { ExperimentsListView } from "@situ/web-app-ui";
import { useExperiments } from "../../hooks/experiments";

export function ExperimentsListPage() {
  return <ExperimentsListView experiments={useExperiments()} />;
}

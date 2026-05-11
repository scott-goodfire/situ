import { MeasurementsListView } from "@situ/web-app-ui";
import { useMeasurements } from "../../hooks/measurements";

export function MeasurementsListPage() {
  return <MeasurementsListView measurements={useMeasurements()} />;
}

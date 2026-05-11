import { createFileRoute } from "@tanstack/react-router";
import { MeasurementsListPage } from "../pages/measurements-list-page";

export const Route = createFileRoute("/measurements")({
  component: MeasurementsListPage,
});

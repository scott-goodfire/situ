import { createFileRoute } from "@tanstack/react-router";
import { ActivitiesPage } from "../pages/activities-page";

export const Route = createFileRoute("/activities")({
  component: ActivitiesPage,
});

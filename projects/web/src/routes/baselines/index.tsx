import { createFileRoute } from "@tanstack/react-router";
import { BaselinesListPage } from "../../pages/baselines-list-page";

export const Route = createFileRoute("/baselines/")({
  component: BaselinesListPage,
});

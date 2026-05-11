import { createFileRoute } from "@tanstack/react-router";
import { EvaluationsListPage } from "../../pages/evaluations-list-page";

export const Route = createFileRoute("/evaluations/")({
  component: EvaluationsListPage,
});

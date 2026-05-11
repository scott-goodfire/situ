import { createFileRoute } from "@tanstack/react-router";
import { ExperimentsListPage } from "../../pages/experiments-list-page";

export const Route = createFileRoute("/experiments/")({
  component: ExperimentsListPage,
});

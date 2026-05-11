import { createFileRoute } from "@tanstack/react-router";
import { HypothesesListPage } from "../../pages/hypotheses-list-page";

export const Route = createFileRoute("/hypotheses/")({
  component: HypothesesListPage,
});

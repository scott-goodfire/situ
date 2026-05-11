import { createFileRoute } from "@tanstack/react-router";
import { AgentsListPage } from "../pages/agents-list-page";

export const Route = createFileRoute("/agents")({
  component: AgentsListPage,
});

import { createFileRoute } from "@tanstack/react-router";
import { WorkItemsListPage } from "../pages/work-items-list-page";

export const Route = createFileRoute("/work-items")({
  component: WorkItemsListPage,
});

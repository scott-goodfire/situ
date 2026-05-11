import { createFileRoute } from "@tanstack/react-router";
import { EntityLinksListPage } from "../pages/entity-links-list-page";

export const Route = createFileRoute("/entity-links")({
  component: EntityLinksListPage,
});

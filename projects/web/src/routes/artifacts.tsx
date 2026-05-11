import { createFileRoute } from "@tanstack/react-router";
import { ArtifactsListPage } from "../pages/artifacts-list-page";

export const Route = createFileRoute("/artifacts")({
  component: ArtifactsListPage,
});

import { DxEmptyState } from "@situ/web-ui";
import { createRootRoute } from "@tanstack/react-router";
import { AppShell } from "../app/app-shell";

export const Route = createRootRoute({
  component: AppShell,
  notFoundComponent: () => (
    <DxEmptyState
      heading="Page not found"
      description="The page you tried to open does not exist."
    />
  ),
  errorComponent: ({ error }: { error: unknown }) => (
    <DxEmptyState
      heading="Something went wrong"
      description={error instanceof Error ? error.message : "Unexpected error."}
    />
  ),
});

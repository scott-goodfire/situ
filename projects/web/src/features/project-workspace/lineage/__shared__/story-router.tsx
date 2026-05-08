import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { useMemo, type ReactNode } from "react";

export function StoryRouter({
  initialPath = "/projects/P1/lineage",
  children,
}: {
  initialPath?: string;
  children: ReactNode;
}) {
  const router = useMemo(
    () => createStoryRouter({ initialPath, children }),
    [initialPath, children],
  );
  return <RouterProvider router={router} />;
}

function createStoryRouter({
  initialPath,
  children,
}: {
  initialPath: string;
  children: ReactNode;
}) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const projectRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/projects/$projectId",
    component: () => <Outlet />,
  });
  const lineageRoute = createRoute({
    getParentRoute: () => projectRoute,
    path: "lineage",
    component: () => <>{children}</>,
    validateSearch: (search: Record<string, unknown>) => ({
      experimentId:
        typeof search.experimentId === "string" ? search.experimentId : undefined,
    }),
  });
  // Stub other project sub-routes that LineageDetailPanel links into so the
  // memory history matcher doesn't 404 if a story renders those Links.
  const hypothesisRoute = createRoute({
    getParentRoute: () => projectRoute,
    path: "hypotheses/$hypothesisId",
    component: () => <>{children}</>,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([
      projectRoute.addChildren([lineageRoute, hypothesisRoute]),
    ]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

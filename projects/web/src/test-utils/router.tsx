// Test utility for components that use @tanstack/react-router's <Link>,
// <Outlet>, or hooks like useNavigate. Builds a minimal in-memory router
// with the wrapped component as the root route's component.
//
// Pattern reference: TanStack/router discussion #583.
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

export function renderInRouter(ui: ReactNode, initialPath = "/") {
  const rootRoute = createRootRoute({
    component: () => <>{ui}</>,
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  return <RouterProvider router={router} />;
}

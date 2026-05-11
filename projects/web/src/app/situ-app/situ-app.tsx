import { DxToaster, DxTooltipProvider } from "@situ/web-ui";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { ReplicacheProvider } from "../replicache";
import { routeTree } from "../../routeTree.gen";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function SituApp() {
  return (
    <ReplicacheProvider>
      <DxTooltipProvider>
        <RouterProvider router={router} />
        <DxToaster />
      </DxTooltipProvider>
    </ReplicacheProvider>
  );
}

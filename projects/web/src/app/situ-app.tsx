import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { DxToaster, DxTooltipProvider, useDxTheme } from "@situ/web-ui";
import { router } from "./router";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function SituApp() {
  useDxTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <DxTooltipProvider>
        <RouterProvider router={router} />
        <DxToaster />
      </DxTooltipProvider>
    </QueryClientProvider>
  );
}

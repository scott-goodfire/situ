import { Toaster as SonnerToaster, toast } from "sonner";

export function DxToaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      gap={8}
      offset={24}
      toastOptions={{
        classNames: {
          toast: "dx-toast",
          title: "dx-toast__title",
          description: "dx-toast__description",
          actionButton: "dx-toast__action",
          closeButton: "dx-toast__close",
        },
      }}
    />
  );
}

export { toast };

import { Toaster as SonnerToaster, toast } from "sonner";
import * as s from "./dx-toaster.css";

export function DxToaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      gap={8}
      offset={24}
      toastOptions={{
        classNames: {
          toast: s.toast,
          title: s.title,
          description: s.description,
          actionButton: s.action,
          closeButton: s.close,
        },
      }}
    />
  );
}

export { toast };

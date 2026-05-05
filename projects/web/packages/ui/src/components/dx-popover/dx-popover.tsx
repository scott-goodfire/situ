import { Popover } from "@base-ui/react/popover";
import type { ReactElement, ReactNode } from "react";

export function DxPopover({
  trigger,
  children,
  side = "bottom",
  align = "center",
}: {
  trigger: ReactElement;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}) {
  return (
    <Popover.Root>
      <Popover.Trigger render={trigger} />
      <Popover.Portal>
        <Popover.Positioner
          side={side}
          align={align}
          sideOffset={6}
          className="dx-popover__positioner"
        >
          <Popover.Popup className="dx-popover__popup">{children}</Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

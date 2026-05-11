import { Popover } from "@base-ui/react/popover";
import type { ReactElement, ReactNode } from "react";
import * as s from "./dx-popover.css";

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
        <Popover.Positioner side={side} align={align} sideOffset={6} className={s.positioner}>
          <Popover.Popup className={s.popup}>{children}</Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

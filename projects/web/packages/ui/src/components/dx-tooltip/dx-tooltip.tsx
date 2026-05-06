import { Tooltip } from "@base-ui/react/tooltip";
import type { ReactElement, ReactNode } from "react";
import * as s from "./dx-tooltip.css";

export function DxTooltip({
  content,
  children,
  side = "top",
}: {
  content: ReactNode;
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner side={side} sideOffset={6} className={s.positioner}>
          <Tooltip.Popup className={s.popup}>{content}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function DxTooltipProvider({ children }: { children: ReactNode }) {
  return <Tooltip.Provider delay={400}>{children}</Tooltip.Provider>;
}

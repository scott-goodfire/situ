import { Tooltip } from "@base-ui/react/tooltip";
import type { ReactNode } from "react";

export function DxTooltip({
  content,
  children,
  side = "top",
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={<>{children}</>} />
      <Tooltip.Portal>
        <Tooltip.Positioner side={side} sideOffset={6} className="dx-tooltip__positioner">
          <Tooltip.Popup className="dx-tooltip__popup">{content}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function DxTooltipProvider({ children }: { children: ReactNode }) {
  return <Tooltip.Provider delay={400}>{children}</Tooltip.Provider>;
}

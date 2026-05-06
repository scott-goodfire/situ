import { Separator } from "@base-ui/react/separator";
import { classNames } from "../../class-names";
import * as s from "./dx-divider.css";

export type DxDividerOrientation = "horizontal" | "vertical";

export function DxDivider({
  orientation = "horizontal",
  className,
}: {
  orientation?: DxDividerOrientation;
  className?: string;
}) {
  return (
    <Separator
      orientation={orientation}
      className={classNames({
        values: [s.divider, orientation === "vertical" ? s.vertical : s.horizontal, className],
      })}
    />
  );
}

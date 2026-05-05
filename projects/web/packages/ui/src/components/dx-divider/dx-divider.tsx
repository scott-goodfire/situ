import { Separator } from "@base-ui/react/separator";
import { classNames } from "../../utils/class-names";

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
        values: ["dx-divider", `dx-divider--${orientation}`, className],
      })}
    />
  );
}

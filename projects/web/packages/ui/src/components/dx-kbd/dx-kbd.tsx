import type { ReactNode } from "react";
import { classNames } from "../../utils/class-names";

export type DxKbdSize = "sm" | "md";

export function DxKbd({
  children,
  size = "md",
  className,
}: {
  children: ReactNode;
  size?: DxKbdSize;
  className?: string;
}) {
  return (
    <kbd
      className={classNames({
        values: ["dx-kbd", `dx-kbd--${size}`, className],
      })}
    >
      {children}
    </kbd>
  );
}

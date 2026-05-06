import type { ReactNode } from "react";
import { classNames } from "../../utils/class-names";
import * as s from "./dx-kbd.css";

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
    <kbd className={classNames({ values: [s.kbd, size === "sm" && s.small, className] })}>
      {children}
    </kbd>
  );
}

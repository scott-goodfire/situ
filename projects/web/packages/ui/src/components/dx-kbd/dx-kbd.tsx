import type { ReactNode } from "react";
import { classNames } from "../../utils/class-names";

export function DxKbd({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <kbd className={classNames({ values: ["dx-kbd", className] })}>{children}</kbd>
  );
}

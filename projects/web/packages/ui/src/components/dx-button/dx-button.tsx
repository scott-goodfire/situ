import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { classNames } from "../../utils/class-names";

type BaseButtonProps = ComponentPropsWithoutRef<typeof BaseButton>;

export type DxButtonProps = Omit<BaseButtonProps, "className"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "small" | "medium";
  iconBefore?: ReactNode;
  iconAfter?: ReactNode;
  className?: string;
};

export function DxButton({
  variant = "secondary",
  size = "medium",
  iconBefore,
  iconAfter,
  className,
  type = "button",
  children,
  ...props
}: DxButtonProps) {
  const buttonClassName = classNames({
    values: ["dx-button", `dx-button--${variant}`, `dx-button--${size}`, className],
  });

  return (
    <BaseButton {...props} className={buttonClassName} type={type}>
      {iconBefore && <span className="dx-button__icon">{iconBefore}</span>}
      {children}
      {iconAfter && <span className="dx-button__icon">{iconAfter}</span>}
    </BaseButton>
  );
}

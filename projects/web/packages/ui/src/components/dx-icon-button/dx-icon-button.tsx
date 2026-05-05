import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentPropsWithoutRef } from "react";
import { classNames } from "../../utils/class-names";

type BaseButtonProps = ComponentPropsWithoutRef<typeof BaseButton>;

export type DxIconButtonProps = Omit<BaseButtonProps, "className"> & {
  variant?: "ghost" | "secondary";
  size?: "small" | "medium";
  ariaLabel: string;
  className?: string;
};

export function DxIconButton({
  variant = "ghost",
  size = "medium",
  ariaLabel,
  className,
  type = "button",
  ...props
}: DxIconButtonProps) {
  const buttonClassName = classNames({
    values: [
      "dx-icon-button",
      `dx-icon-button--${variant}`,
      `dx-icon-button--${size}`,
      className,
    ],
  });

  return <BaseButton {...props} className={buttonClassName} type={type} aria-label={ariaLabel} />;
}

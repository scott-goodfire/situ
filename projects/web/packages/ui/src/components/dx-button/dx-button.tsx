import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentPropsWithoutRef } from "react";
import { classNames } from "../../utils/class-names";

type BaseButtonProps = ComponentPropsWithoutRef<typeof BaseButton>;

export type DxButtonProps = Omit<BaseButtonProps, "className"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "small" | "medium";
  className?: string;
};

export function DxButton({
  variant = "secondary",
  size = "medium",
  className,
  type = "button",
  ...props
}: DxButtonProps) {
  const buttonClassName = classNames({
    values: ["dx-button", `dx-button--${variant}`, `dx-button--${size}`, className],
  });

  return <BaseButton {...props} className={buttonClassName} type={type} />;
}

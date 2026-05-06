import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentPropsWithoutRef } from "react";
import { classNames } from "../../utils/class-names";
import * as s from "./dx-icon-button.css";

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
      s.iconButton,
      variant === "secondary" && s.secondary,
      size === "small" && s.small,
      className,
    ],
  });

  return <BaseButton {...props} className={buttonClassName} type={type} aria-label={ariaLabel} />;
}

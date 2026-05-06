import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { classNames } from "../../utils/class-names";
import * as s from "./dx-button.css";

type BaseButtonProps = ComponentPropsWithoutRef<typeof BaseButton>;

export type DxButtonProps = Omit<BaseButtonProps, "className"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "small" | "medium";
  iconBefore?: ReactNode;
  iconAfter?: ReactNode;
  className?: string;
};

const VARIANT_CLASS = {
  primary: s.primary,
  secondary: s.secondary,
  ghost: s.ghost,
  danger: s.dangerVariant,
} as const;

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
    values: [s.button, VARIANT_CLASS[variant], size === "small" && s.small, className],
  });

  return (
    <BaseButton {...props} className={buttonClassName} type={type}>
      {iconBefore && <span className={s.icon}>{iconBefore}</span>}
      {children}
      {iconAfter && <span className={s.icon}>{iconAfter}</span>}
    </BaseButton>
  );
}

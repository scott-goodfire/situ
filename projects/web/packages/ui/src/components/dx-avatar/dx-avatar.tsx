import { Avatar } from "@base-ui/react/avatar";
import { classNames } from "../../class-names";
import * as s from "./dx-avatar.css";

export type DxAvatarSize = "sm" | "md";

export function DxAvatar({
  initials,
  imageSrc,
  alt,
  size = "md",
  className,
}: {
  initials: string;
  imageSrc?: string;
  alt?: string;
  size?: DxAvatarSize;
  className?: string;
}) {
  return (
    <Avatar.Root
      className={classNames({ values: [s.avatar, size === "sm" ? s.sm : s.md, className] })}
    >
      {imageSrc && <Avatar.Image src={imageSrc} alt={alt ?? initials} className={s.image} />}
      <Avatar.Fallback className={s.fallback}>{initials}</Avatar.Fallback>
    </Avatar.Root>
  );
}

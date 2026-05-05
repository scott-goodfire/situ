import { Avatar } from "@base-ui/react/avatar";
import { classNames } from "../../utils/class-names";

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
      className={classNames({
        values: ["dx-avatar", `dx-avatar--${size}`, className],
      })}
    >
      {imageSrc && <Avatar.Image src={imageSrc} alt={alt ?? initials} className="dx-avatar__image" />}
      <Avatar.Fallback className="dx-avatar__fallback">{initials}</Avatar.Fallback>
    </Avatar.Root>
  );
}

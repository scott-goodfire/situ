import { Menu } from "@base-ui/react/menu";
import type { ReactNode } from "react";

export type DxMenuItem = {
  id: string;
  label: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
};

export function DxMenu({
  trigger,
  items,
}: {
  trigger: ReactNode;
  items: DxMenuItem[];
}) {
  return (
    <Menu.Root>
      <Menu.Trigger render={<>{trigger}</>} />
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="start" className="dx-menu__positioner">
          <Menu.Popup className="dx-menu__popup">
            {items.map((item) => (
              <Menu.Item
                key={item.id}
                className="dx-menu__item"
                onClick={item.onSelect}
                disabled={item.disabled}
              >
                {item.label}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

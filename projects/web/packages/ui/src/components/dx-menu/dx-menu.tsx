import { Menu } from "@base-ui/react/menu";
import type { ReactElement, ReactNode } from "react";
import * as s from "./dx-menu.css";

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
  trigger: ReactElement;
  items: DxMenuItem[];
}) {
  return (
    <Menu.Root>
      <Menu.Trigger render={trigger} />
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="start" className={s.positioner}>
          <Menu.Popup className={s.popup}>
            {items.map((item) => (
              <Menu.Item
                key={item.id}
                className={s.item}
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

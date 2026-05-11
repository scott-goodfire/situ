import { Menu } from "@base-ui/react/menu";
import { Check } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import * as s from "./dx-multi-select.css";

export type DxMultiSelectItem<TValue extends string> = {
  value: TValue;
  label: ReactNode;
};

export function DxMultiSelect<TValue extends string>({
  trigger,
  items,
  selected,
  onToggle,
  compact = false,
}: {
  trigger: ReactElement;
  items: DxMultiSelectItem<TValue>[];
  selected: ReadonlySet<TValue>;
  onToggle: (value: TValue) => void;
  /** Drop the leading check indicator slot. Caller's label content owns the selected/unselected visual. */
  compact?: boolean;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger render={trigger} />
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className={s.positioner}>
          <Menu.Popup className={s.popup}>
            {items.map((item) => (
              <Menu.CheckboxItem
                key={item.value}
                className={compact ? s.itemCompact : s.item}
                checked={selected.has(item.value)}
                onCheckedChange={() => onToggle(item.value)}
                closeOnClick={false}
              >
                {!compact && (
                  <span className={s.indicator} aria-hidden="true">
                    <Menu.CheckboxItemIndicator>
                      <Check size={12} />
                    </Menu.CheckboxItemIndicator>
                  </span>
                )}
                <span className={s.label}>{item.label}</span>
              </Menu.CheckboxItem>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

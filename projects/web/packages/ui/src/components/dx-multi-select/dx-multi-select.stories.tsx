import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DxMultiSelect } from "./dx-multi-select";
import { DxButton } from "../dx-button/dx-button";

type StatusValue = "active" | "success" | "warning" | "danger";

const ITEMS = [
  { value: "active" as StatusValue, label: "In progress" },
  { value: "success" as StatusValue, label: "Verified" },
  { value: "warning" as StatusValue, label: "Needs evidence" },
  { value: "danger" as StatusValue, label: "Failed" },
];

function MultiSelectExample({ initial }: { initial: StatusValue[] }) {
  const [selected, setSelected] = useState<Set<StatusValue>>(() => new Set(initial));
  const triggerLabel =
    selected.size === ITEMS.length
      ? "Status: All"
      : selected.size === 0
        ? "Status: None"
        : `Status: ${selected.size} of ${ITEMS.length}`;

  return (
    <DxMultiSelect
      trigger={<DxButton variant="secondary">{triggerLabel}</DxButton>}
      items={ITEMS}
      selected={selected}
      onToggle={(value) =>
        setSelected((current) => {
          const next = new Set(current);
          if (next.has(value)) {
            next.delete(value);
          } else {
            next.add(value);
          }
          return next;
        })
      }
    />
  );
}

const meta = {
  title: "UI/Dx Multi Select",
  component: MultiSelectExample,
} satisfies Meta<typeof MultiSelectExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AllSelected: Story = {
  args: { initial: ["active", "success", "warning", "danger"] },
};

export const Partial: Story = {
  args: { initial: ["success"] },
};

export const NoneSelected: Story = {
  args: { initial: [] },
};

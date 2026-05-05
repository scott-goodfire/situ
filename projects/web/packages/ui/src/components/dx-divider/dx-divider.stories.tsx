import type { Meta, StoryObj } from "@storybook/react";
import { DxDivider } from "./dx-divider";

const meta = {
  title: "UI/Dx Divider",
  component: DxDivider,
} satisfies Meta<typeof DxDivider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  args: {},
  render: () => (
    <div style={{ display: "grid", gap: 12, width: 360 }}>
      <span style={{ fontSize: 13 }}>Above</span>
      <DxDivider />
      <span style={{ fontSize: 13 }}>Below</span>
    </div>
  ),
};

export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, height: 24 }}>
      <span style={{ fontSize: 13 }}>Left</span>
      <DxDivider orientation="vertical" />
      <span style={{ fontSize: 13 }}>Right</span>
    </div>
  ),
};

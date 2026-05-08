import type { Meta, StoryObj } from "@storybook/react";
import { DxAvatar } from "./dx-avatar";

const meta = {
  title: "UI/Dx Avatar",
  component: DxAvatar,
  args: {
    initials: "SM",
  },
} satisfies Meta<typeof DxAvatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Medium: Story = {};

export const Small: Story = { args: { size: "sm" } };

export const Cluster: Story = {
  args: { initials: "" },
  render: () => (
    <div style={{ display: "inline-flex" }}>
      <DxAvatar initials="A" />
      <DxAvatar initials="W" />
      <DxAvatar initials="R" />
    </div>
  ),
};

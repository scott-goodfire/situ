import type { Meta, StoryObj } from "@storybook/react-vite";
import { DxKbd } from "./dx-kbd";

const meta = {
  title: "UI/Dx Kbd",
  component: DxKbd,
  args: {
    children: "1",
  },
} satisfies Meta<typeof DxKbd>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Single: Story = {};

export const Combo: Story = {
  args: { children: "" },
  render: () => (
    <div style={{ display: "inline-flex", gap: 4, alignItems: "center", fontSize: 13 }}>
      <DxKbd>⌘</DxKbd>
      <DxKbd>K</DxKbd>
    </div>
  ),
};

export const Inline: Story = {
  args: { children: "" },
  render: () => (
    <p style={{ fontSize: 13 }}>
      Press <DxKbd>1</DxKbd> Gesture (swipe up with 3 fingers)
    </p>
  ),
};

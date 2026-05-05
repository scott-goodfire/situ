import type { Meta, StoryObj } from "@storybook/react";
import { DxBadge } from "./dx-badge";

const meta = {
  title: "UI/Dx Badge",
  component: DxBadge,
  args: {
    children: "Badge",
  },
} satisfies Meta<typeof DxBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

export const Success: Story = {
  args: {
    tone: "success",
    children: "Connected",
  },
};

export const Warning: Story = {
  args: {
    tone: "warning",
    children: "Suspicious",
  },
};

export const Danger: Story = {
  args: {
    tone: "danger",
    children: "Error",
  },
};

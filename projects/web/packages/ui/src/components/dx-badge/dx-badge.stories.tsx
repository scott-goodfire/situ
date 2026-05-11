import type { Meta, StoryObj } from "@storybook/react-vite";
import { DxBadge } from "./dx-badge";

const meta: Meta<typeof DxBadge> = {
  title: "UI/Dx Badge",
  component: DxBadge,
  argTypes: {
    tone: {
      control: { type: "select" },
      options: ["neutral", "success", "warning", "danger"],
    },
    withDot: { control: { type: "boolean" } },
  },
  args: {
    tone: "neutral",
    withDot: false,
    children: "Badge",
  },
};

export default meta;

type Story = StoryObj<typeof DxBadge>;

export const Neutral: Story = {};
export const Success: Story = { args: { tone: "success", children: "Active" } };
export const Warning: Story = { args: { tone: "warning", children: "Pending" } };
export const Danger: Story = { args: { tone: "danger", children: "Failed" } };
export const WithDot: Story = { args: { tone: "success", withDot: true, children: "Live" } };

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
    children: "Badge",
    tone: "neutral",
    withDot: false,
  },
};

export default meta;

type Story = StoryObj<typeof DxBadge>;

export const Neutral: Story = {};
export const Success: Story = { args: { tone: "success", children: "Connected" } };
export const Warning: Story = { args: { tone: "warning", children: "Suspicious" } };
export const Danger: Story = { args: { tone: "danger", children: "Error" } };
export const WithDot: Story = {
  args: { tone: "success", withDot: true, children: "Connected" },
};

export const AllTones: Story = {
  args: { children: "" },
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <DxBadge>neutral</DxBadge>
      <DxBadge tone="success">success</DxBadge>
      <DxBadge tone="warning">warning</DxBadge>
      <DxBadge tone="danger">danger</DxBadge>
      <DxBadge tone="success" withDot>
        with dot
      </DxBadge>
    </div>
  ),
};

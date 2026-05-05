import type { Meta, StoryObj } from "@storybook/react-vite";
import { DxButton } from "./dx-button";

const meta: Meta<typeof DxButton> = {
  title: "UI/Dx Button",
  component: DxButton,
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["primary", "secondary", "ghost", "danger"],
    },
    size: {
      control: { type: "select" },
      options: ["small", "medium"],
    },
    disabled: { control: { type: "boolean" } },
  },
  args: {
    children: "Button",
    variant: "secondary",
    size: "medium",
    disabled: false,
  },
};

export default meta;

type Story = StoryObj<typeof DxButton>;

export const Primary: Story = { args: { variant: "primary" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Danger: Story = { args: { variant: "danger", children: "Delete" } };
export const Small: Story = { args: { size: "small" } };
export const Disabled: Story = { args: { disabled: true } };

export const AllVariants: Story = {
  args: { children: "" },
  render: () => (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <DxButton variant="primary">Primary</DxButton>
      <DxButton variant="secondary">Secondary</DxButton>
      <DxButton variant="ghost">Ghost</DxButton>
      <DxButton variant="danger">Danger</DxButton>
    </div>
  ),
};

import type { Meta, StoryObj } from "@storybook/react";
import { DxButton } from "./dx-button";

const meta = {
  title: "UI/Dx Button",
  component: DxButton,
  args: {
    children: "Button",
  },
} satisfies Meta<typeof DxButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: "primary",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
  },
};

export const Danger: Story = {
  args: {
    variant: "danger",
  },
};

export const Small: Story = {
  args: {
    size: "small",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

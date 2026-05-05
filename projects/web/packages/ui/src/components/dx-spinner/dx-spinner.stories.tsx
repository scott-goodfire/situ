import type { Meta, StoryObj } from "@storybook/react";
import { DxSpinner } from "./dx-spinner";

const meta = {
  title: "UI/Dx Spinner",
  component: DxSpinner,
} satisfies Meta<typeof DxSpinner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = { args: { size: 12 } };

export const Large: Story = { args: { size: 24 } };

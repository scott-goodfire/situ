import type { Meta, StoryObj } from "@storybook/react-vite";
import { DxSpinner } from "./dx-spinner";

const meta: Meta<typeof DxSpinner> = {
  title: "UI/Dx Spinner",
  component: DxSpinner,
  args: { size: 16 },
};

export default meta;

type Story = StoryObj<typeof DxSpinner>;

export const Default: Story = {};
export const Large: Story = { args: { size: 32 } };

import type { Meta, StoryObj } from "@storybook/react";
import { DxCommand } from "./dx-command";

const meta = {
  title: "UI/Dx Command",
  component: DxCommand,
} satisfies Meta<typeof DxCommand>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    command: "curl https://cursor.com/install -fsS | bash",
  },
};

export const Short: Story = {
  args: {
    command: "situ start",
  },
};

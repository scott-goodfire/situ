import type { Meta, StoryObj } from "@storybook/react";
import { DxEmptyState } from "./dx-empty-state";
import { DxButton } from "../dx-button/dx-button";

const meta = {
  title: "UI/Dx Empty State",
  component: DxEmptyState,
} satisfies Meta<typeof DxEmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    heading: "Try Situ.",
    description: "Run a session from your terminal to see live agent activity.",
    action: <DxButton variant="primary">Download for macOS</DxButton>,
  },
};

export const Minimal: Story = {
  args: { heading: "No active session." },
};

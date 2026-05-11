import type { Meta, StoryObj } from "@storybook/react-vite";
import { DxTooltip, DxTooltipProvider } from "./dx-tooltip";
import { DxButton } from "../dx-button/dx-button";

const meta = {
  title: "UI/Dx Tooltip",
  component: DxTooltip,
} satisfies Meta<typeof DxTooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: "Save changes (⌘S)",
    children: <DxButton variant="secondary">Hover me</DxButton>,
  },
  render: (args) => (
    <DxTooltipProvider>
      <DxTooltip {...args} />
    </DxTooltipProvider>
  ),
};

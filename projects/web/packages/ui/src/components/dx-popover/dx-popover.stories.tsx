import type { Meta, StoryObj } from "@storybook/react";
import { vars } from "../../theme.css";
import { DxPopover } from "./dx-popover";
import { DxButton } from "../dx-button/dx-button";

const meta = {
  title: "UI/Dx Popover",
  component: DxPopover,
} satisfies Meta<typeof DxPopover>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    trigger: <DxButton variant="secondary">Open popover</DxButton>,
    children: (
      <>
        <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>
          Plan Mission Control
        </div>
        <div style={{ fontSize: 12, color: vars.color.mutedForeground }}>
          Drafted implementation steps in feature-prd.md
        </div>
      </>
    ),
  },
};

import type { Meta, StoryObj } from "@storybook/react";
import { DxTabs } from "./dx-tabs";

const meta = {
  title: "UI/Dx Tabs",
  component: DxTabs,
} satisfies Meta<typeof DxTabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tabs: [
      {
        id: "feature-prd",
        label: "feature-prd.md",
        content: <div style={{ padding: 12, fontSize: 13 }}>Plans · feature-prd.md</div>,
      },
      {
        id: "presence",
        label: "presence.ts",
        content: <div style={{ padding: 12, fontSize: 13 }}>Source · presence.ts</div>,
      },
    ],
  },
};

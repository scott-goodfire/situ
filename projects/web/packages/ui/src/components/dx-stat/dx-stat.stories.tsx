import type { Meta, StoryObj } from "@storybook/react";
import { DxStat } from "./dx-stat";

const meta = {
  title: "UI/Dx Stat",
  component: DxStat,
} satisfies Meta<typeof DxStat>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Added: Story = { args: { tone: "added", children: "+20" } };

export const Removed: Story = { args: { tone: "removed", children: "−3" } };

export const Diff: Story = {
  args: { children: "" },
  render: () => (
    <div style={{ display: "inline-flex", gap: 6, fontSize: 13 }}>
      <DxStat tone="added">+20</DxStat>
      <DxStat tone="removed">−3</DxStat>
      <span style={{ color: "var(--muted-foreground-tertiary)" }}>· Drafted implementation</span>
    </div>
  ),
};

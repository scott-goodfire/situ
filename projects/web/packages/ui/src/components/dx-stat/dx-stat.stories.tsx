import type { Meta, StoryObj } from "@storybook/react-vite";
import { vars } from "../../theme.css";
import { DxStat } from "./dx-stat";

const meta: Meta<typeof DxStat> = {
  title: "UI/Dx Stat",
  component: DxStat,
  argTypes: {
    tone: {
      control: { type: "select" },
      options: ["neutral", "added", "removed"],
    },
  },
  args: {
    tone: "added",
    children: "+20",
  },
};

export default meta;

type Story = StoryObj<typeof DxStat>;

export const Added: Story = { args: { tone: "added", children: "+20" } };
export const Removed: Story = { args: { tone: "removed", children: "−3" } };
export const Neutral: Story = { args: { tone: "neutral", children: "12" } };

export const Diff: Story = {
  args: { children: "" },
  render: () => (
    <div style={{ display: "inline-flex", gap: 6, fontSize: 13 }}>
      <DxStat tone="added">+20</DxStat>
      <DxStat tone="removed">−3</DxStat>
      <span style={{ color: vars.color.mutedForegroundTertiary }}>· Drafted implementation</span>
    </div>
  ),
};

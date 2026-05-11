import type { Meta, StoryObj } from "@storybook/react-vite";
import { DxStatBlock } from "./dx-stat-block";

const meta = {
  title: "UI/Dx Stat Block",
  component: DxStatBlock,
} satisfies Meta<typeof DxStatBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: "100M+",
    caption: "Lines of enterprise code written per day",
  },
};

export const Row: Story = {
  args: { value: "" },
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, width: 720 }}>
      <DxStatBlock value="64%" caption="Fortune 500 companies using situ" />
      <DxStatBlock value="50,000+" caption="Sessions tracked this month" />
      <DxStatBlock value="100M+" caption="Events recorded" />
    </div>
  ),
};

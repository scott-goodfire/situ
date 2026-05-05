import type { Meta, StoryObj } from "@storybook/react";
import { DxListRow } from "./dx-list-row";
import { DxSpinner } from "../dx-spinner/dx-spinner";

const meta = {
  title: "UI/Dx List Row",
  component: DxListRow,
} satisfies Meta<typeof DxListRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    icon: <DxSpinner />,
    title: "Build Landing Page",
    status: "Reading docs",
  },
  render: (args) => (
    <div style={{ width: 280 }}>
      <DxListRow {...args} />
    </div>
  ),
};

export const Active: Story = {
  args: {
    icon: <DxSpinner />,
    title: "Plan Mission Control",
    status: "Drafted implementation",
    meta: "now",
    active: true,
  },
  render: (args) => (
    <div style={{ width: 280 }}>
      <DxListRow {...args} />
    </div>
  ),
};

export const List: Story = {
  args: { title: "List" },
  render: () => (
    <div style={{ width: 280 }}>
      <DxListRow icon={<DxSpinner />} title="Build Landing Page" status="Reading docs" />
      <DxListRow icon={<DxSpinner />} title="Analyze Tab vs Agent Usage" status="Fetching data" />
      <DxListRow
        icon={<DxSpinner />}
        title="Plan Mission Control"
        status="Drafted implementation"
        meta="now"
        active
      />
    </div>
  ),
};

import type { Meta, StoryObj } from "@storybook/react";
import type { SignedContribution } from "@situ/chart-model";
import { ContributionBars } from "./contribution-bars";

const contributions = [
  {
    id: "head-2-7",
    label: "Head L2H7",
    value: 0.82,
    group: "attention",
  },
  {
    id: "feature-1042",
    label: "Feature 1042",
    value: -0.57,
    group: "sae",
  },
  {
    id: "mlp-3",
    label: "MLP L3",
    value: 0.31,
    group: "mlp",
  },
  {
    id: "head-1-4",
    label: "Head L1H4",
    value: -0.18,
    group: "attention",
  },
] satisfies SignedContribution[];

const meta = {
  title: "Charts/Contribution Bars",
  component: ContributionBars,
  decorators: [
    (Story) => (
      <div style={{ width: "760px" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    contributions,
  },
} satisfies Meta<typeof ContributionBars>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TopComponents: Story = {};

export const Empty: Story = {
  args: {
    contributions: [],
  },
};

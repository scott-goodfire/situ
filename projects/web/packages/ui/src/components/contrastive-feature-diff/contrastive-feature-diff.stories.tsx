import type { Meta, StoryObj } from "@storybook/react";
import type { ContrastiveFeatureSet } from "@almanac/chart-model";
import { ContrastiveFeatureDiff } from "./contrastive-feature-diff";

const featureSet = {
  id: "billing-vs-cancellation",
  label: "Billing vs cancellation",
  leftLabel: "billing wins",
  rightLabel: "cancellation wins",
  differences: [
    {
      id: "feature-invoice",
      label: "invoice lookup",
      value: 0.74,
      group: "tooling",
    },
    {
      id: "feature-refund",
      label: "refund policy",
      value: 0.41,
      group: "policy",
    },
    {
      id: "feature-save",
      label: "save offer",
      value: -0.63,
      group: "retention",
    },
    {
      id: "feature-account-close",
      label: "account closure",
      value: -0.52,
      group: "retention",
    },
  ],
} satisfies ContrastiveFeatureSet;

const meta = {
  title: "Charts/Contrastive Feature Diff",
  component: ContrastiveFeatureDiff,
  decorators: [
    (Story) => (
      <div style={{ width: "760px" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    featureSet,
  },
} satisfies Meta<typeof ContrastiveFeatureDiff>;

export default meta;

type Story = StoryObj<typeof meta>;

export const BillingVsCancellation: Story = {};

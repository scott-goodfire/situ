import type { Meta, StoryObj } from "@storybook/react";
import type { TokenFeatureMatrix as TokenFeatureMatrixData } from "../../chart-model";
import { TokenFeatureMatrix } from "./token-feature-matrix";

const matrix = {
  id: "billing-activations",
  label: "Billing token features",
  tokens: [
    {
      id: "tok-refund",
      label: "refund",
      position: 0,
    },
    {
      id: "tok-invoice",
      label: "invoice",
      position: 1,
    },
    {
      id: "tok-urgent",
      label: "urgent",
      position: 2,
    },
    {
      id: "tok-cancel",
      label: "cancel",
      position: 3,
    },
  ],
  features: [
    {
      id: "feature-billing",
      label: "Billing",
    },
    {
      id: "feature-retention",
      label: "Retention",
    },
    {
      id: "feature-policy",
      label: "Policy",
    },
  ],
  activations: [
    {
      id: "billing-refund",
      featureId: "feature-billing",
      tokenId: "tok-refund",
      value: 0.84,
    },
    {
      id: "billing-invoice",
      featureId: "feature-billing",
      tokenId: "tok-invoice",
      value: 0.76,
    },
    {
      id: "billing-urgent",
      featureId: "feature-billing",
      tokenId: "tok-urgent",
      value: 0.18,
    },
    {
      id: "billing-cancel",
      featureId: "feature-billing",
      tokenId: "tok-cancel",
      value: -0.06,
    },
    {
      id: "retention-refund",
      featureId: "feature-retention",
      tokenId: "tok-refund",
      value: -0.16,
    },
    {
      id: "retention-invoice",
      featureId: "feature-retention",
      tokenId: "tok-invoice",
      value: 0.12,
    },
    {
      id: "retention-urgent",
      featureId: "feature-retention",
      tokenId: "tok-urgent",
      value: 0.28,
    },
    {
      id: "retention-cancel",
      featureId: "feature-retention",
      tokenId: "tok-cancel",
      value: 0.69,
    },
    {
      id: "policy-refund",
      featureId: "feature-policy",
      tokenId: "tok-refund",
      value: 0.22,
    },
    {
      id: "policy-invoice",
      featureId: "feature-policy",
      tokenId: "tok-invoice",
      value: 0.31,
    },
    {
      id: "policy-urgent",
      featureId: "feature-policy",
      tokenId: "tok-urgent",
      value: -0.11,
    },
    {
      id: "policy-cancel",
      featureId: "feature-policy",
      tokenId: "tok-cancel",
      value: 0.47,
    },
  ],
} satisfies TokenFeatureMatrixData;

const meta = {
  title: "Charts/Token Feature Matrix",
  component: TokenFeatureMatrix,
  decorators: [
    (Story) => (
      <div style={{ width: "760px" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    matrix,
  },
} satisfies Meta<typeof TokenFeatureMatrix>;

export default meta;

type Story = StoryObj<typeof meta>;

export const BillingActivations: Story = {};

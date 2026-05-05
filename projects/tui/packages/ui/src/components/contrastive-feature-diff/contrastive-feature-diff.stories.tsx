import type { ContrastiveFeatureSet } from "@almanac/chart-model";
import { ContrastiveFeatureDiff } from "./contrastive-feature-diff.js";
import type { TuiStory } from "../../stories/story-types.js";

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

export const stories = [
  {
    id: "contrastive-feature-diff/billing-vs-cancellation",
    title: "Contrastive Feature Diff",
    name: "billing-vs-cancellation",
    render: () => <ContrastiveFeatureDiff featureSet={featureSet} />,
  },
] satisfies TuiStory[];

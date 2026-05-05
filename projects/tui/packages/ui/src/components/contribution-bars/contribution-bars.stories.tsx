import type { SignedContribution } from "@situ/chart-model";
import { ContributionBars } from "./contribution-bars.js";
import type { TuiStory } from "../../stories/story-types.js";

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

export const stories = [
  {
    id: "contribution-bars/top-components",
    title: "Contribution Bars",
    name: "top-components",
    render: () => <ContributionBars contributions={contributions} />,
  },
  {
    id: "contribution-bars/empty",
    title: "Contribution Bars",
    name: "empty",
    render: () => <ContributionBars contributions={[]} />,
  },
] satisfies TuiStory[];

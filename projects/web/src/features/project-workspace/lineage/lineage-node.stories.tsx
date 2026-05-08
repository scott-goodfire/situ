import type { Meta, StoryObj } from "@storybook/react-vite";
import { LineageNode } from "./lineage-node";
import { stageDecorator } from "./__shared__/decorators";
import { makeExperiment } from "./__shared__/fixtures";

const meta: Meta<typeof LineageNode> = {
  title: "Lineage/LineageNode",
  component: LineageNode,
  parameters: { layout: "fullscreen" },
  decorators: [stageDecorator],
  args: { onSelect: () => {} },
};

export default meta;

type Story = StoryObj<typeof LineageNode>;

export const Neutral: Story = {
  args: {
    experiment: makeExperiment({
      id: "EX1",
      title: "MLP width 64 → 128",
      t: 1,
    }),
    hypothesisIds: ["H1"],
    criticStatus: "pending",
    isSelected: false,
    isFailed: false,
  },
};

export const Reviewed: Story = {
  args: {
    experiment: makeExperiment({
      id: "EX2",
      title: "Cosine LR schedule from prior art",
      status: "closed",
      t: 2,
    }),
    hypothesisIds: ["H1", "H3"],
    criticStatus: "reviewed",
    isSelected: false,
    isFailed: false,
  },
};

export const Concern: Story = {
  args: {
    experiment: makeExperiment({
      id: "EX3",
      title: "Aggressive dropout with 4× batch",
      status: "active",
      t: 3,
    }),
    hypothesisIds: ["H2"],
    criticStatus: "concern",
    isSelected: false,
    isFailed: false,
  },
};

export const Failed: Story = {
  args: {
    experiment: makeExperiment({
      id: "EX4",
      title: "Streaming retrieval with stale cache",
      status: "active",
      t: 4,
    }),
    hypothesisIds: ["H4"],
    criticStatus: "pending",
    isSelected: false,
    isFailed: true,
  },
};

export const Selected: Story = {
  args: {
    experiment: makeExperiment({
      id: "EX5",
      title: "Train longer with cosine LR + EMA",
      status: "closed",
      t: 5,
    }),
    hypothesisIds: ["H1", "H3", "H5"],
    criticStatus: "reviewed",
    isSelected: true,
    isFailed: false,
  },
};

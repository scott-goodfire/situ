import type { Meta, StoryObj } from "@storybook/react";
import type { HeatmapMatrix } from "@almanac/chart-model";
import { HeatmapGrid } from "./heatmap-grid";

const patchingMatrix = {
  id: "activation-patching",
  label: "Activation patching",
  rows: [
    { id: "layer-0", label: "Layer 0" },
    { id: "layer-1", label: "Layer 1" },
    { id: "layer-2", label: "Layer 2" },
    { id: "layer-3", label: "Layer 3" },
  ],
  columns: [
    { id: "prompt", label: "Prompt" },
    { id: "subject", label: "Subject" },
    { id: "relation", label: "Relation" },
    { id: "answer", label: "Answer" },
  ],
  cells: [
    { id: "l0-prompt", rowId: "layer-0", columnId: "prompt", value: 0.05 },
    { id: "l0-subject", rowId: "layer-0", columnId: "subject", value: -0.18 },
    { id: "l0-relation", rowId: "layer-0", columnId: "relation", value: 0.1 },
    { id: "l0-answer", rowId: "layer-0", columnId: "answer", value: 0.02 },
    { id: "l1-prompt", rowId: "layer-1", columnId: "prompt", value: 0.12 },
    { id: "l1-subject", rowId: "layer-1", columnId: "subject", value: 0.44 },
    { id: "l1-relation", rowId: "layer-1", columnId: "relation", value: 0.28 },
    { id: "l1-answer", rowId: "layer-1", columnId: "answer", value: -0.08 },
    { id: "l2-prompt", rowId: "layer-2", columnId: "prompt", value: -0.05 },
    { id: "l2-subject", rowId: "layer-2", columnId: "subject", value: 0.22 },
    { id: "l2-relation", rowId: "layer-2", columnId: "relation", value: 0.81 },
    { id: "l2-answer", rowId: "layer-2", columnId: "answer", value: 0.37 },
    { id: "l3-prompt", rowId: "layer-3", columnId: "prompt", value: -0.12 },
    { id: "l3-subject", rowId: "layer-3", columnId: "subject", value: -0.21 },
    { id: "l3-relation", rowId: "layer-3", columnId: "relation", value: 0.3 },
    { id: "l3-answer", rowId: "layer-3", columnId: "answer", value: 0.58 },
  ],
} satisfies HeatmapMatrix;

const meta = {
  title: "Charts/Heatmap Grid",
  component: HeatmapGrid,
  decorators: [
    (Story) => (
      <div style={{ width: "760px" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    matrix: patchingMatrix,
  },
} satisfies Meta<typeof HeatmapGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ActivationPatching: Story = {};

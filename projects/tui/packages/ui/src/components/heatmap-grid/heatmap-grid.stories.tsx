import type { HeatmapMatrix } from "@almanac/chart-model";
import { HeatmapGrid } from "./heatmap-grid.js";
import type { TuiStory } from "../../stories/story-types.js";

const patchingMatrix = {
  id: "activation-patching",
  label: "Activation patching",
  rows: [
    {
      id: "layer-0",
      label: "L0",
    },
    {
      id: "layer-1",
      label: "L1",
    },
    {
      id: "layer-2",
      label: "L2",
    },
    {
      id: "layer-3",
      label: "L3",
    },
  ],
  columns: [
    {
      id: "prompt",
      label: "Pr",
    },
    {
      id: "subject",
      label: "Su",
    },
    {
      id: "relation",
      label: "Re",
    },
    {
      id: "answer",
      label: "An",
    },
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

export const stories = [
  {
    id: "heatmap-grid/activation-patching",
    title: "Heatmap Grid",
    name: "activation-patching",
    render: () => <HeatmapGrid matrix={patchingMatrix} />,
  },
] satisfies TuiStory[];

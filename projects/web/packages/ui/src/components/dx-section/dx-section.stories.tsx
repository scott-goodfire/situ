import type { Meta, StoryObj } from "@storybook/react";
import { DxSection } from "./dx-section";

const meta = {
  title: "UI/Dx Section",
  component: DxSection,
  args: {
    title: "Run",
    children: <p>run_0001 | running | experiments 3</p>,
  },
} satisfies Meta<typeof DxSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMutedText: Story = {
  args: {
    title: "Timeline",
    children: <p className="dx-muted">No events yet</p>,
  },
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { ExperimentDetailView } from "./experiment-detail-view";
import { EXPERIMENT_FIXTURES } from "../../fixtures";

const meta: Meta<typeof ExperimentDetailView> = {
  title: "App UI/Experiment Detail",
  component: ExperimentDetailView,
};

export default meta;

type Story = StoryObj<typeof ExperimentDetailView>;

export const Active: Story = {
  args: { experiment: EXPERIMENT_FIXTURES[0] },
};

export const ChildExperiment: Story = {
  args: { experiment: EXPERIMENT_FIXTURES[1] },
};

export const Triage: Story = {
  args: { experiment: EXPERIMENT_FIXTURES[3] },
};

export const NotFound: Story = {
  args: { experiment: undefined },
};

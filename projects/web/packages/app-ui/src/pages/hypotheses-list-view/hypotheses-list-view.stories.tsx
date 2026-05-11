import type { Meta, StoryObj } from "@storybook/react-vite";
import { HypothesesListView } from "./hypotheses-list-view";
import { HYPOTHESIS_FIXTURES } from "../../fixtures";

const meta: Meta<typeof HypothesesListView> = {
  title: "App UI/Hypotheses",
  component: HypothesesListView,
};

export default meta;

type Story = StoryObj<typeof HypothesesListView>;

export const Default: Story = {
  args: { hypotheses: HYPOTHESIS_FIXTURES },
};

export const Empty: Story = {
  args: { hypotheses: [] },
};

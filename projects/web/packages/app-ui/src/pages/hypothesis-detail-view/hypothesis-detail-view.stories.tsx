import type { Meta, StoryObj } from "@storybook/react-vite";
import { HypothesisDetailView } from "./hypothesis-detail-view";
import { HYPOTHESIS_FIXTURES } from "../../fixtures";

const meta: Meta<typeof HypothesisDetailView> = {
  title: "App UI/Hypothesis Detail",
  component: HypothesisDetailView,
};

export default meta;

type Story = StoryObj<typeof HypothesisDetailView>;

export const Active: Story = {
  args: { hypothesis: HYPOTHESIS_FIXTURES[0] },
};

export const Done: Story = {
  args: { hypothesis: HYPOTHESIS_FIXTURES[2] },
};

export const Failed: Story = {
  args: { hypothesis: HYPOTHESIS_FIXTURES[4] },
};

export const NotFound: Story = {
  args: { hypothesis: undefined },
};

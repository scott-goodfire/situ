import type { Meta, StoryObj } from "@storybook/react-vite";
import { BaselineDetailView } from "./baseline-detail-view";
import { BASELINE_FIXTURES } from "../../fixtures";

const meta: Meta<typeof BaselineDetailView> = {
  title: "App UI/Baseline Detail",
  component: BaselineDetailView,
};

export default meta;

type Story = StoryObj<typeof BaselineDetailView>;

export const Done: Story = { args: { baseline: BASELINE_FIXTURES[0] } };
export const Active: Story = { args: { baseline: BASELINE_FIXTURES[1] } };
export const Triage: Story = { args: { baseline: BASELINE_FIXTURES[2] } };
export const NotFound: Story = { args: { baseline: undefined } };

import type { Meta, StoryObj } from "@storybook/react-vite";
import { EvaluationsListView } from "./evaluations-list-view";
import { EVALUATION_FIXTURES } from "../../fixtures";

const meta: Meta<typeof EvaluationsListView> = {
  title: "App UI/Evaluations",
  component: EvaluationsListView,
};

export default meta;

type Story = StoryObj<typeof EvaluationsListView>;

export const Default: Story = { args: { evaluations: EVALUATION_FIXTURES } };
export const Empty: Story = { args: { evaluations: [] } };

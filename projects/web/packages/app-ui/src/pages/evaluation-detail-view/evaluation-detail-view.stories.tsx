import type { Meta, StoryObj } from "@storybook/react-vite";
import { EvaluationDetailView } from "./evaluation-detail-view";
import { EVALUATION_FIXTURES } from "../../fixtures";

const meta: Meta<typeof EvaluationDetailView> = {
  title: "App UI/Evaluation Detail",
  component: EvaluationDetailView,
};

export default meta;

type Story = StoryObj<typeof EvaluationDetailView>;

export const Done: Story = { args: { evaluation: EVALUATION_FIXTURES[0] } };
export const InReview: Story = { args: { evaluation: EVALUATION_FIXTURES[1] } };
export const Triage: Story = { args: { evaluation: EVALUATION_FIXTURES[2] } };
export const NotFound: Story = { args: { evaluation: undefined } };

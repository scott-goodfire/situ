import type { Meta, StoryObj } from "@storybook/react-vite";
import { BaselinesListView } from "./baselines-list-view";
import { BASELINE_FIXTURES } from "../../fixtures";

const meta: Meta<typeof BaselinesListView> = {
  title: "App UI/Baselines",
  component: BaselinesListView,
};

export default meta;

type Story = StoryObj<typeof BaselinesListView>;

export const Default: Story = { args: { baselines: BASELINE_FIXTURES } };
export const Empty: Story = { args: { baselines: [] } };

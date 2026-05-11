import type { Meta, StoryObj } from "@storybook/react-vite";
import { ExperimentsListView } from "./experiments-list-view";
import { EXPERIMENT_FIXTURES } from "../../fixtures";

const meta: Meta<typeof ExperimentsListView> = {
  title: "App UI/Experiments",
  component: ExperimentsListView,
};

export default meta;

type Story = StoryObj<typeof ExperimentsListView>;

export const Default: Story = {
  args: { experiments: EXPERIMENT_FIXTURES },
};

export const Empty: Story = {
  args: { experiments: [] },
};

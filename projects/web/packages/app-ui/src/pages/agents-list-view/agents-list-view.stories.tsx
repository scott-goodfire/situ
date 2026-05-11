import type { Meta, StoryObj } from "@storybook/react-vite";
import { AgentsListView } from "./agents-list-view";
import { AGENT_FIXTURES } from "../../fixtures";

const meta: Meta<typeof AgentsListView> = {
  title: "App UI/Agents",
  component: AgentsListView,
};

export default meta;

type Story = StoryObj<typeof AgentsListView>;

export const Default: Story = { args: { agents: AGENT_FIXTURES } };
export const Empty: Story = { args: { agents: [] } };

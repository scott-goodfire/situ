import type { Meta, StoryObj } from "@storybook/react-vite";
import { WorkItemsListView } from "./work-items-list-view";
import { WORK_ITEM_FIXTURES } from "../../fixtures";

const meta: Meta<typeof WorkItemsListView> = {
  title: "App UI/Work Items",
  component: WorkItemsListView,
};

export default meta;

type Story = StoryObj<typeof WorkItemsListView>;

export const Default: Story = { args: { workItems: WORK_ITEM_FIXTURES } };
export const Empty: Story = { args: { workItems: [] } };

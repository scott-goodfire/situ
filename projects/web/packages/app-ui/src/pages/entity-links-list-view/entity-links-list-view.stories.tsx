import type { Meta, StoryObj } from "@storybook/react-vite";
import { EntityLinksListView } from "./entity-links-list-view";
import { ENTITY_LINK_FIXTURES } from "../../fixtures";

const meta: Meta<typeof EntityLinksListView> = {
  title: "App UI/Entity Links",
  component: EntityLinksListView,
};

export default meta;

type Story = StoryObj<typeof EntityLinksListView>;

export const Default: Story = { args: { entityLinks: ENTITY_LINK_FIXTURES } };
export const Empty: Story = { args: { entityLinks: [] } };

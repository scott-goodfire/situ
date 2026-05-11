import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArtifactsListView } from "./artifacts-list-view";
import { ARTIFACT_FIXTURES } from "../../fixtures";

const meta: Meta<typeof ArtifactsListView> = {
  title: "App UI/Artifacts",
  component: ArtifactsListView,
};

export default meta;

type Story = StoryObj<typeof ArtifactsListView>;

export const Default: Story = { args: { artifacts: ARTIFACT_FIXTURES } };
export const Empty: Story = { args: { artifacts: [] } };

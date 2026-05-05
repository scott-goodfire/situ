import type { Meta, StoryObj } from "@storybook/react";
import { DxTextField } from "./dx-text-field";

const meta = {
  title: "UI/Dx Text Field",
  component: DxTextField,
  args: {
    label: "Goal",
    placeholder: "Describe what the run should investigate",
  },
} satisfies Meta<typeof DxTextField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithDescription: Story = {
  args: {
    description: "Keep this broad enough for the agent to propose useful probes.",
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: "Improve support-agent resolution on billing tickets.",
  },
};

export const WithError: Story = {
  args: {
    error: "Add enough context for the harness to start a run.",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: "Read-only run context",
  },
};

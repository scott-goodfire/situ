import type { Meta, StoryObj } from "@storybook/react-vite";
import { DxTextField } from "./dx-text-field";

const meta: Meta<typeof DxTextField> = {
  title: "UI/Dx Text Field",
  component: DxTextField,
  args: {
    label: "Anthropic API key",
    placeholder: "sk-ant-...",
  },
};

export default meta;

type Story = StoryObj<typeof DxTextField>;

export const Default: Story = {};
export const WithDescription: Story = {
  args: {
    description: "Stored only on this machine, in ~/.situ/secrets.json.",
  },
};
export const WithError: Story = {
  args: {
    value: "wrong",
    error: "That key was rejected by Anthropic.",
  },
};
export const Disabled: Story = { args: { disabled: true, value: "sk-ant-…" } };

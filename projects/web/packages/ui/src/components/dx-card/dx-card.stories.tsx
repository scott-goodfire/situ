import type { Meta, StoryObj } from "@storybook/react-vite";
import { DxCard } from "./dx-card";

const meta: Meta<typeof DxCard> = {
  title: "UI/Dx Card",
  component: DxCard,
  argTypes: {
    tone: { control: { type: "select" }, options: ["default", "warning", "danger"] },
    padding: { control: { type: "select" }, options: ["none", "tight", "default"] },
    interactive: { control: { type: "boolean" } },
  },
  args: {
    tone: "default",
    padding: "default",
    interactive: false,
    children: "A card",
  },
};

export default meta;

type Story = StoryObj<typeof DxCard>;

export const Default: Story = {};
export const Warning: Story = { args: { tone: "warning", children: "Heads up" } };
export const Danger: Story = { args: { tone: "danger", children: "Something went wrong" } };
export const Interactive: Story = { args: { interactive: true, children: "Click me" } };

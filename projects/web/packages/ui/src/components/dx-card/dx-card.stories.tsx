import type { Meta, StoryObj } from "@storybook/react-vite";
import { DxCard } from "./dx-card";

const meta: Meta<typeof DxCard> = {
  title: "UI/Dx Card",
  component: DxCard,
  argTypes: {
    tone: {
      control: { type: "select" },
      options: ["default", "warning", "danger"],
    },
    padding: {
      control: { type: "select" },
      options: ["none", "tight", "default"],
    },
    interactive: { control: { type: "boolean" } },
  },
  args: {
    tone: "default",
    padding: "default",
    interactive: false,
    children: (
      <>
        <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>
          Filtering low-confidence retrieval
        </div>
        <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          Drop weak snippets before tool calls so the agent cites fewer irrelevant policies.
        </div>
      </>
    ),
  },
};

export default meta;

type Story = StoryObj<typeof DxCard>;

export const Default: Story = {};
export const Warning: Story = { args: { tone: "warning" } };
export const Danger: Story = { args: { tone: "danger" } };
export const Tight: Story = { args: { padding: "tight" } };
export const Interactive: Story = { args: { interactive: true } };

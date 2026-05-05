import type { Meta, StoryObj } from "@storybook/react";
import { DxCard } from "./dx-card";

const meta = {
  title: "UI/Dx Card",
  component: DxCard,
  args: {
    children: (
      <>
        <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>Filtering low-confidence retrieval</div>
        <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          Drop weak snippets before tool calls so the agent cites fewer irrelevant policies.
        </div>
      </>
    ),
  },
} satisfies Meta<typeof DxCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Warning: Story = { args: { tone: "warning" } };

export const Danger: Story = { args: { tone: "danger" } };

export const Tight: Story = { args: { padding: "tight" } };

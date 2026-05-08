import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConnectionBadge } from "./connection-badge";

const meta = {
  title: "App UI/Connection Badge",
  component: ConnectionBadge,
} satisfies Meta<typeof ConnectionBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Checking: Story = {
  args: { state: { kind: "checking" } },
};

export const Connected: Story = {
  args: { state: { kind: "connected" } },
};

export const Disconnected: Story = {
  args: {
    state: {
      kind: "disconnected",
      message: "Session stream disconnected.",
    },
  },
};

export const Failed: Story = {
  args: {
    state: {
      kind: "failed",
      message: "Lost connection to the local session.",
    },
  },
};

export const Missing: Story = {
  args: { state: { kind: "missing" } },
};

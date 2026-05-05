import type { Meta, StoryObj } from "@storybook/react";
import { EventTimeline } from "./event-timeline";
import { runningEvents, suspiciousEvents } from "../fixtures/story-data";

const meta = {
  title: "Components/Event Timeline",
  component: EventTimeline,
} satisfies Meta<typeof EventTimeline>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    events: [],
  },
};

export const Running: Story = {
  args: {
    events: runningEvents,
  },
};

export const WithWarning: Story = {
  args: {
    events: suspiciousEvents,
  },
};

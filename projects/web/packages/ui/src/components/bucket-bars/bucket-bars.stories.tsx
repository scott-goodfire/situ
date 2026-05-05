import type { Meta, StoryObj } from "@storybook/react";
import type { BucketDatum } from "@almanac/chart-model";
import { BucketBars } from "./bucket-bars";

const experimentStatusBuckets = [
  {
    id: "completed",
    label: "Completed",
    value: 12,
    tone: "success",
  },
  {
    id: "running",
    label: "Running",
    value: 2,
    tone: "info",
  },
  {
    id: "suspicious",
    label: "Suspicious",
    value: 1,
    tone: "danger",
  },
  {
    id: "failed",
    label: "Failed",
    value: 3,
    tone: "warning",
  },
] satisfies BucketDatum[];

const meta = {
  title: "Charts/Bucket Bars",
  component: BucketBars,
  decorators: [
    (Story) => (
      <div style={{ width: "760px" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    buckets: experimentStatusBuckets,
  },
} satisfies Meta<typeof BucketBars>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ExperimentStatus: Story = {};

export const Empty: Story = {
  args: {
    buckets: [],
  },
};

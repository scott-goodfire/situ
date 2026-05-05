import type { BucketDatum } from "@situ/chart-model";
import { BucketBars } from "./bucket-bars.js";
import type { TuiStory } from "../../stories/story-types.js";

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

export const stories = [
  {
    id: "bucket-bars/experiment-status",
    title: "Bucket Bars",
    name: "experiment-status",
    render: () => <BucketBars buckets={experimentStatusBuckets} />,
  },
  {
    id: "bucket-bars/empty",
    title: "Bucket Bars",
    name: "empty",
    render: () => <BucketBars buckets={[]} />,
  },
] satisfies TuiStory[];

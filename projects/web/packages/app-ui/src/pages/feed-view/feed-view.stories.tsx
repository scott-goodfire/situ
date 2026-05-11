import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FeedEntryRecord } from "../../domain/records";
import { FeedView } from "./feed-view";

const meta: Meta<typeof FeedView> = {
  title: "App UI/Feed",
  component: FeedView,
};

export default meta;

type Story = StoryObj<typeof FeedView>;

const ENTRIES: FeedEntryRecord[] = [
  {
    id: "feed_1",
    projectId: "rp_demo",
    summaryMarkdown:
      "The scientist landed a first-letter penalty variant that raises dev accuracy from 0.7481 to 0.7629. Hard filter follow-up is queued. (evt_abc, evt_def)",
    severity: "progress",
    citedAppEventIds: ["evt_abc", "evt_def"],
    windowStartedAt: "2026-05-11T01:00:00.000Z",
    windowEndedAt: "2026-05-11T01:05:00.000Z",
    createdAt: "2026-05-11T01:05:05.000Z",
  },
  {
    id: "feed_2",
    projectId: "rp_demo",
    summaryMarkdown:
      "Two scientist experiments failed verification: the OOV lookup path was structurally unreachable and the merged e1+e2 pool regressed the dev split. Manager is replanning. (evt_ghi, evt_jkl)",
    severity: "failure",
    citedAppEventIds: ["evt_ghi", "evt_jkl"],
    windowStartedAt: "2026-05-11T00:55:00.000Z",
    windowEndedAt: "2026-05-11T01:00:00.000Z",
    createdAt: "2026-05-11T01:00:10.000Z",
  },
  {
    id: "feed_3",
    projectId: "rp_demo",
    summaryMarkdown:
      "Waiting on compute pool `local-gpu` — three queued exploit tasks and no live targets. (evt_mno)",
    severity: "stuck",
    citedAppEventIds: ["evt_mno"],
    windowStartedAt: "2026-05-11T00:50:00.000Z",
    windowEndedAt: "2026-05-11T00:55:00.000Z",
    createdAt: "2026-05-11T00:55:12.000Z",
  },
  {
    id: "feed_4",
    projectId: "rp_demo",
    summaryMarkdown:
      "Manager confirmed the baseline at 0.7481 dev accuracy and opened exploratory search across seven hypothesis families.",
    severity: "info",
    citedAppEventIds: [],
    windowStartedAt: "2026-05-11T00:20:00.000Z",
    windowEndedAt: "2026-05-11T00:25:00.000Z",
    createdAt: "2026-05-11T00:25:02.000Z",
  },
];

export const Default: Story = {
  args: { entries: ENTRIES, projectKickedOff: true },
};

export const WaitingForFirstNarration: Story = {
  args: { entries: [], projectKickedOff: true },
};

export const NoActiveProject: Story = {
  args: { entries: [], projectKickedOff: false },
};

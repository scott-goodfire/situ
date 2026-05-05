import type { Meta, StoryObj } from "@storybook/react";
import { DxNotice } from "./dx-notice";

const meta = {
  title: "UI/Dx Notice",
  component: DxNotice,
  args: {
    children: "No active Almanac harness found.",
  },
} satisfies Meta<typeof DxNotice>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Warning: Story = {
  args: {
    tone: "warning",
    children: "This result has not been reproduced.",
  },
};

export const Danger: Story = {
  args: {
    tone: "danger",
    children: "Lost connection to the local Almanac session server.",
  },
};

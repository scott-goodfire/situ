import type { Meta, StoryObj } from "@storybook/react";
import { DxCodeBlock } from "./dx-code-block";

const meta = {
  title: "UI/Dx Code Block",
  component: DxCodeBlock,
} satisfies Meta<typeof DxCodeBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Diff: Story = {
  args: {
    filename: "report.py",
    lines: [
      { tone: "neutral", text: "import logging" },
      { tone: "neutral", text: "" },
      { tone: "added", text: "logger = logging.getLogger(__name__)" },
      { tone: "added", text: "logger.info('starting')" },
      { tone: "removed", text: "print('starting')" },
      { tone: "neutral", text: "" },
      { tone: "neutral", text: "def main():" },
      { tone: "neutral", text: "    pass" },
    ],
    showLineNumbers: true,
  },
};

export const Plain: Story = {
  args: {
    lines: [
      { text: "situ app" },
      { text: "situ tui" },
      { text: "situ status" },
    ],
  },
};

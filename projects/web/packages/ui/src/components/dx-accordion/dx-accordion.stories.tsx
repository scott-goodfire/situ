import type { Meta, StoryObj } from "@storybook/react";
import { DxAccordion } from "./dx-accordion";

const meta = {
  title: "UI/Dx Accordion",
  component: DxAccordion,
} satisfies Meta<typeof DxAccordion>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [
      {
        id: "integrate",
        question: "How does Bugbot integrate with my existing workflow?",
        answer: "Bugbot reviews every pull request, posting findings as inline comments.",
      },
      {
        id: "customize",
        question: "Can I customize how Bugbot does reviews?",
        answer: "Yes — define rules in your repo's .bugbot.yaml file.",
      },
      {
        id: "accuracy",
        question: "How accurate is Bugbot's bug detection?",
        answer: "False positive rate sits below 4% on the standard benchmark.",
      },
    ],
  },
  render: (args) => (
    <div style={{ width: 640 }}>
      <DxAccordion {...args} />
    </div>
  ),
};

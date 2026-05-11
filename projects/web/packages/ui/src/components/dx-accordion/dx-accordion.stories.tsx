import type { Meta, StoryObj } from "@storybook/react-vite";
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
        question: "How does the review assistant integrate with my existing workflow?",
        answer: "The assistant reviews every pull request, posting findings as inline comments.",
      },
      {
        id: "customize",
        question: "Can I customize how automated reviews run?",
        answer: "Yes — define rules in your repo's review config file.",
      },
      {
        id: "accuracy",
        question: "How accurate is the review assistant's bug detection?",
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

import type { Meta, StoryObj } from "@storybook/react-vite";
import { DxIconButton } from "./dx-icon-button";

const meta = {
  title: "UI/Dx Icon Button",
  component: DxIconButton,
  args: {
    ariaLabel: "Close",
    children: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M6 6 L18 18 M6 18 L18 6" strokeLinecap="round" />
      </svg>
    ),
  },
} satisfies Meta<typeof DxIconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ghost: Story = {};

export const Secondary: Story = { args: { variant: "secondary" } };

export const Small: Story = { args: { size: "small" } };

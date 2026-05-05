import type { Meta, StoryObj } from "@storybook/react";
import { DxLink } from "./dx-link";

const meta = {
  title: "UI/Dx Link",
  component: DxLink,
  args: {
    children: "Read documentation",
    href: "#",
  },
} satisfies Meta<typeof DxLink>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Accent: Story = {};

export const WithArrow: Story = { args: { withArrow: true } };

export const Muted: Story = { args: { variant: "muted", children: "View more posts" } };

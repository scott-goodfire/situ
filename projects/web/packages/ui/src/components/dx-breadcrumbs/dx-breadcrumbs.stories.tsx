import type { Meta, StoryObj } from "@storybook/react";
import { DxBreadcrumbs } from "./dx-breadcrumbs";

const meta = {
  title: "UI/Dx Breadcrumbs",
  component: DxBreadcrumbs,
} satisfies Meta<typeof DxBreadcrumbs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [
      { id: "plans", label: "Plans", href: "#" },
      { id: "feature", label: "feature-prd.md" },
    ],
  },
};

export const Deep: Story = {
  args: {
    items: [
      { id: "p", label: "Project", href: "#" },
      { id: "h", label: "hyp_0001", href: "#" },
      { id: "e", label: "exp_0042", href: "#" },
      { id: "v", label: "evaluation" },
    ],
  },
};

import type { Meta, StoryObj } from "@storybook/react-vite";
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
      { id: "h", label: "H1", href: "#" },
      { id: "e", label: "EX42", href: "#" },
      { id: "v", label: "evaluation" },
    ],
  },
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { DxMenu } from "./dx-menu";
import { DxButton } from "../dx-button/dx-button";

const meta = {
  title: "UI/Dx Menu",
  component: DxMenu,
} satisfies Meta<typeof DxMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    trigger: <DxButton variant="secondary">Composer 2 ▾</DxButton>,
    items: [
      { id: "compose", label: "Compose" },
      { id: "review", label: "Review" },
      { id: "rollback", label: "Roll back", disabled: true },
    ],
  },
};

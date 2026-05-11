import type { Meta, StoryObj } from "@storybook/react-vite";
import { DxToaster, toast } from "./dx-toaster";
import { DxButton } from "../dx-button/dx-button";

const meta = {
  title: "UI/Dx Toaster",
  component: DxToaster,
} satisfies Meta<typeof DxToaster>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <DxButton onClick={() => toast("Saved presence pattern")}>Toast</DxButton>
      <DxButton
        variant="secondary"
        onClick={() =>
          toast.success("Pattern indexed", {
            description: "12 new tokens · 3.4s",
          })
        }
      >
        With description
      </DxButton>
      <DxButton
        variant="danger"
        onClick={() => toast.error("Run failed", { description: "Worker stopped responding." })}
      >
        Error
      </DxButton>
      <DxToaster />
    </div>
  ),
};

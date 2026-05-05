import type { Meta, StoryObj } from "@storybook/react";
import { Beaker, FileText, FlaskConical, ListChecks, Users } from "lucide-react";
import { DxSidebar, DxSidebarItem, DxSidebarSection } from "./dx-sidebar";

const meta = {
  title: "UI/Dx Sidebar",
  component: DxSidebar,
} satisfies Meta<typeof DxSidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <DxSidebarSection title="Project">
          <DxSidebarItem icon={<FileText size={14} />} label="Overview" href="#" active />
          <DxSidebarItem icon={<Beaker size={14} />} label="Hypotheses" badge="12" href="#" />
          <DxSidebarItem icon={<FlaskConical size={14} />} label="Experiments" badge="3" href="#" />
          <DxSidebarItem icon={<ListChecks size={14} />} label="Evaluations" href="#" />
          <DxSidebarItem icon={<Users size={14} />} label="Agents" href="#" />
        </DxSidebarSection>
      </>
    ),
  },
  render: (args) => (
    <div
      style={{
        width: 240,
        height: 540,
        background: "var(--panel)",
        border: "1px solid var(--border-02)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <DxSidebar {...args} />
    </div>
  ),
};

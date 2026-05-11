import type { Meta, StoryObj } from "@storybook/react-vite";
import { Beaker, FileText, FlaskConical, ListChecks, Users } from "lucide-react";
import { vars } from "../../theme.css";
import { DxSidebar, DxSidebarItem, DxSidebarSection, DxSidebarTreeItem } from "./dx-sidebar";

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
        background: vars.color.panel,
        border: `1px solid ${vars.color.border02}`,
        borderRadius: vars.radius.lg,
      }}
    >
      <DxSidebar {...args} />
    </div>
  ),
};

export const WithTreeItems: Story = {
  args: {
    children: (
      <>
        <DxSidebarSection title="Workspace">
          <DxSidebarItem icon={<FileText size={14} />} label="Overview" href="#" />
          <DxSidebarTreeItem
            icon={<Beaker size={14} />}
            label="Hypotheses"
            badge="12"
            defaultExpanded
          >
            <DxSidebarItem label="Active" href="#" badge="4" active />
            <DxSidebarItem label="In review" href="#" badge="2" />
            <DxSidebarItem label="Done" href="#" badge="6" />
          </DxSidebarTreeItem>
          <DxSidebarTreeItem icon={<FlaskConical size={14} />} label="Experiments" badge="3">
            <DxSidebarItem label="Active" href="#" badge="1" />
            <DxSidebarItem label="Triage" href="#" badge="2" />
          </DxSidebarTreeItem>
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
        background: vars.color.panel,
        border: `1px solid ${vars.color.border02}`,
        borderRadius: vars.radius.lg,
      }}
    >
      <DxSidebar {...args} />
    </div>
  ),
};

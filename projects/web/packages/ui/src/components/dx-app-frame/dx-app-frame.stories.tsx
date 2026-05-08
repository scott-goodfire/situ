import type { Meta, StoryObj } from "@storybook/react";
import {
  Activity,
  Beaker,
  ChevronsLeftRight,
  FileText,
  FlaskConical,
  ListChecks,
  Users,
} from "lucide-react";
import { vars } from "../../theme.css";
import { DxAppFrame } from "./dx-app-frame";
import {
  DxSidebar,
  DxSidebarItem,
  DxSidebarSection,
} from "../dx-sidebar/dx-sidebar";
import { DxBreadcrumbs } from "../dx-breadcrumbs/dx-breadcrumbs";
import { DxBadge } from "../dx-badge/dx-badge";
import { DxButton } from "../dx-button/dx-button";

const meta = {
  title: "UI/Dx App Frame",
  component: DxAppFrame,
} satisfies Meta<typeof DxAppFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

const sidebar = (
  <DxSidebar
    header={
      <div style={{ display: "grid", gap: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: vars.color.foreground }}>
          Situ
        </span>
        <span style={{ fontSize: 11, color: vars.color.mutedForegroundTertiary }}>
          ~/work/research
        </span>
      </div>
    }
    footer={
      <span style={{ fontSize: 11, color: vars.color.mutedForegroundTertiary }}>
        v0.0.1 · SOC 2
      </span>
    }
  >
    <DxSidebarSection title="Project">
      <DxSidebarItem icon={<FileText size={14} />} label="Overview" href="#" active />
      <DxSidebarItem icon={<Beaker size={14} />} label="Hypotheses" badge="12" href="#" />
      <DxSidebarItem icon={<FlaskConical size={14} />} label="Experiments" badge="3" href="#" />
      <DxSidebarItem icon={<ListChecks size={14} />} label="Evaluations" href="#" />
      <DxSidebarItem icon={<Users size={14} />} label="Agents" href="#" />
      <DxSidebarItem icon={<Activity size={14} />} label="Events" href="#" />
    </DxSidebarSection>

    <DxSidebarSection title="Tools" count={2}>
      <DxSidebarItem icon={<ChevronsLeftRight size={14} />} label="CLI" href="#" />
      <DxSidebarItem icon={<FileText size={14} />} label="Logs" href="#" />
    </DxSidebarSection>
  </DxSidebar>
);

const topBar = (
  <>
    <DxBreadcrumbs
      items={[
        { id: "p", label: "Project", href: "#" },
        { id: "ovw", label: "Overview" },
      ]}
    />
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <DxBadge tone="success" withDot>Connected</DxBadge>
      <DxButton variant="primary">Run</DxButton>
    </div>
  </>
);

export const Default: Story = {
  args: {
    sidebar,
    topBar,
    children: (
      <div style={{ display: "grid", gap: 16, maxWidth: 720 }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.012em", margin: 0 }}>
          Overview
        </h2>
        <p style={{ color: vars.color.mutedForeground, lineHeight: 1.55, margin: 0 }}>
          Twelve hypotheses across three experiments. The retrieval-filter cycle is
          live; prompt-decomposition was closed yesterday after evidence saturated.
        </p>
        <p style={{ color: vars.color.mutedForegroundTertiary, fontSize: 13, margin: 0 }}>
          Last sync 4s ago · 1 agent + 2 workers active
        </p>
      </div>
    ),
  },
  render: (args) => (
    <div style={{ width: "100%", height: 720 }}>
      <DxAppFrame {...args} />
    </div>
  ),
};

export const Bare: Story = {
  args: {
    sidebar: (
      <DxSidebar>
        <DxSidebarSection>
          <DxSidebarItem label="Overview" href="#" active />
          <DxSidebarItem label="Hypotheses" href="#" />
          <DxSidebarItem label="Experiments" href="#" />
        </DxSidebarSection>
      </DxSidebar>
    ),
    children: <p style={{ color: vars.color.mutedForeground }}>No top bar.</p>,
  },
  render: (args) => (
    <div style={{ width: "100%", height: 600 }}>
      <DxAppFrame {...args} />
    </div>
  ),
};

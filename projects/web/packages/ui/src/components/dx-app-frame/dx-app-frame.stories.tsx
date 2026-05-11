import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import {
  Activity,
  Beaker,
  CheckSquare,
  ChevronsLeftRight,
  ClipboardList,
  FileText,
  FlaskConical,
  KeyRound,
  ListChecks,
  Save,
  Target,
  Users,
} from "lucide-react";
import { vars } from "../../theme.css";
import { DxAppFrame } from "./dx-app-frame";
import { DxSidebar, DxSidebarItem, DxSidebarSection } from "../dx-sidebar/dx-sidebar";
import { DxBreadcrumbs } from "../dx-breadcrumbs/dx-breadcrumbs";
import { DxBadge } from "../dx-badge/dx-badge";
import { DxButton } from "../dx-button/dx-button";
import { DxThemeToggle, type DxThemeMode } from "../dx-theme-toggle/dx-theme-toggle";

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
        <span style={{ fontSize: 13, fontWeight: 500, color: vars.color.foreground }}>situ</span>
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
      <DxBadge tone="success" withDot>
        Connected
      </DxBadge>
      <DxButton variant="primary">Run</DxButton>
    </div>
  </>
);

const storyFrame = (args: ComponentProps<typeof DxAppFrame>) => (
  <div style={{ width: "100%", height: 720 }}>
    <DxAppFrame {...args} />
  </div>
);

function SituSidebar({
  mode = "auto",
  workspaceReady,
}: {
  mode?: DxThemeMode;
  workspaceReady: boolean;
}) {
  return (
    <DxSidebar
      footer={
        <div style={{ display: "grid", justifyItems: "start" }}>
          <DxThemeToggle value={mode} onChange={() => {}} />
        </div>
      }
    >
      <DxSidebarSection title="Control">
        <DxSidebarItem
          icon={<ClipboardList size={14} />}
          label="Research Goal"
          badge="1"
          active
          href="#"
        />
      </DxSidebarSection>
      {workspaceReady && (
        <>
          <DxSidebarSection title="Research">
            <DxSidebarItem icon={<Beaker size={14} />} label="Hypotheses" badge="12" href="#" />
            <DxSidebarItem
              icon={<FlaskConical size={14} />}
              label="Experiments"
              badge="3"
              href="#"
            />
            <DxSidebarItem icon={<Target size={14} />} label="Baselines" badge="2" href="#" />
            <DxSidebarItem icon={<ListChecks size={14} />} label="Evaluations" badge="5" href="#" />
          </DxSidebarSection>
          <DxSidebarSection title="Workspace">
            <DxSidebarItem icon={<CheckSquare size={14} />} label="Tasks" badge="7" href="#" />
          </DxSidebarSection>
        </>
      )}
    </DxSidebar>
  );
}

function SettingsSidebar() {
  return (
    <DxSidebar
      footer={
        <div style={{ display: "grid", justifyItems: "start" }}>
          <DxThemeToggle value="auto" onChange={() => {}} />
        </div>
      }
    >
      <DxSidebarSection title="Setup">
        <DxSidebarItem icon={<KeyRound size={14} />} label="Settings" active href="#" />
      </DxSidebarSection>
    </DxSidebar>
  );
}

const settingsGateContent = (
  <div
    style={{
      alignItems: "center",
      display: "grid",
      minHeight: "100%",
    }}
  >
    <div
      style={{
        background: vars.color.panel,
        border: `1px solid ${vars.color.border}`,
        borderRadius: 8,
        display: "grid",
        gap: 18,
        maxWidth: 460,
        padding: 24,
      }}
    >
      <div style={{ display: "grid", gap: 8 }}>
        <h2 style={{ color: vars.color.foreground, fontSize: 22, fontWeight: 600, margin: 0 }}>
          Before we get started
        </h2>
        <p style={{ color: vars.color.mutedForeground, lineHeight: 1.5, margin: 0 }}>
          Save a local Anthropic API key to continue into situ.
        </p>
      </div>
      <label style={{ color: vars.color.foreground, display: "grid", gap: 8, fontSize: 13 }}>
        Anthropic API key
        <input
          placeholder="sk-ant-..."
          type="password"
          style={{
            background: vars.color.panel,
            border: `1px solid ${vars.color.border02}`,
            borderRadius: 6,
            color: vars.color.foreground,
            font: "inherit",
            padding: "9px 10px",
          }}
        />
      </label>
      <div>
        <DxButton iconBefore={<Save size={14} />} variant="primary">
          Save key
        </DxButton>
      </div>
    </div>
  </div>
);

const researchGoalEntryContent = (
  <div style={{ display: "grid", gap: 18, maxWidth: 760 }}>
    <h2 style={{ color: vars.color.foreground, fontSize: 22, fontWeight: 600, margin: 0 }}>
      Research Goal
    </h2>
    <form style={{ display: "grid", gap: 12 }}>
      <label style={{ color: vars.color.foreground, display: "grid", gap: 8, fontSize: 13 }}>
        Research Goal
        <textarea
          placeholder="Describe what the manager should understand, verify, or improve."
          rows={6}
          style={{
            background: vars.color.panel,
            border: `1px solid ${vars.color.border02}`,
            borderRadius: 6,
            color: vars.color.foreground,
            font: "inherit",
            lineHeight: 1.5,
            padding: 10,
            resize: "vertical",
          }}
        />
      </label>
      <div>
        <DxButton variant="primary">Start Research</DxButton>
      </div>
    </form>
  </div>
);

const onboardingContent = (
  <div style={{ display: "grid", gap: 16, maxWidth: 760 }}>
    <div
      style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: 12 }}
    >
      <h2 style={{ color: vars.color.foreground, fontSize: 22, fontWeight: 600, margin: 0 }}>
        Research Goal
      </h2>
      <DxBadge tone="warning">Waiting for you</DxBadge>
    </div>
    <p style={{ color: vars.color.mutedForeground, lineHeight: 1.55, margin: 0 }}>
      Improve the manager loop so it can establish a baseline, ask for clarification, and balance
      exploration against exploitation.
    </p>
    <div
      style={{
        background: vars.color.panel,
        border: `1px solid ${vars.color.border}`,
        borderRadius: 8,
        display: "grid",
        gap: 12,
        padding: 16,
      }}
    >
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <h3 style={{ color: vars.color.foreground, fontSize: 15, fontWeight: 600, margin: 0 }}>
          Baseline Review
        </h3>
        <DxBadge tone="warning">confirmation</DxBadge>
      </div>
      <p style={{ color: vars.color.mutedForeground, lineHeight: 1.5, margin: 0 }}>
        I found the current baseline and am ready to start autonomous research.
      </p>
      <textarea
        aria-label="Notes"
        rows={4}
        style={{
          background: vars.color.panel,
          border: `1px solid ${vars.color.border02}`,
          borderRadius: 6,
          color: vars.color.foreground,
          font: "inherit",
          lineHeight: 1.5,
          padding: 10,
          resize: "vertical",
        }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <DxButton variant="primary">Confirm</DxButton>
        <DxButton>Needs Changes</DxButton>
      </div>
    </div>
  </div>
);

const workspaceUnlockedContent = (
  <div style={{ display: "grid", gap: 16, maxWidth: 760 }}>
    <div
      style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: 12 }}
    >
      <h2 style={{ color: vars.color.foreground, fontSize: 22, fontWeight: 600, margin: 0 }}>
        Research Goal
      </h2>
      <DxBadge tone="warning">In progress</DxBadge>
    </div>
    <p style={{ color: vars.color.mutedForeground, lineHeight: 1.55, margin: 0 }}>
      The baseline was confirmed, so hypotheses, experiments, baselines, evaluations, and tasks are
      now available in the sidebar.
    </p>
  </div>
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
          Twelve hypotheses across three experiments. The retrieval-filter cycle is live;
          prompt-decomposition was closed yesterday after evidence saturated.
        </p>
        <p style={{ color: vars.color.mutedForegroundTertiary, fontSize: 13, margin: 0 }}>
          Last sync 4s ago · 1 agent + 2 workers active
        </p>
      </div>
    ),
  },
  render: storyFrame,
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

export const SettingsGate: Story = {
  args: {
    sidebar: <SettingsSidebar />,
    children: settingsGateContent,
  },
  render: storyFrame,
};

export const ResearchGoalEntry: Story = {
  args: {
    sidebar: <SituSidebar workspaceReady={false} />,
    children: researchGoalEntryContent,
  },
  render: storyFrame,
};

export const OnboardingGatedSidebar: Story = {
  args: {
    sidebar: <SituSidebar workspaceReady={false} />,
    children: onboardingContent,
  },
  render: storyFrame,
};

export const WorkspaceUnlocked: Story = {
  args: {
    sidebar: <SituSidebar workspaceReady />,
    children: workspaceUnlockedContent,
  },
  render: storyFrame,
};

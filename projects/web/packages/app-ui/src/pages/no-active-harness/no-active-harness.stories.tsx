import type { Meta, StoryObj } from "@storybook/react-vite";
import { NoActiveHarnessView } from "./no-active-harness-view";
import { SituShell } from "../../shell/situ-shell";

const meta: Meta<typeof NoActiveHarnessView> = {
  title: "Pages/NoActiveHarness",
  component: NoActiveHarnessView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", padding: 16, background: "var(--stage)" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof NoActiveHarnessView>;

export const Default: Story = {
  args: {
    workspace: "/Users/situ/sandbox/support-agent",
  },
  render: (args) => (
    <SituShell
      workspace="support-agent-demo"
      connection={{ kind: "disconnected" }}
    >
      <NoActiveHarnessView {...args} />
    </SituShell>
  ),
};

export const Minimal: Story = {
  args: {},
  render: (args) => (
    <SituShell workspace="local-dev" connection={{ kind: "checking" }}>
      <NoActiveHarnessView {...args} />
    </SituShell>
  ),
};

export const WithDownload: Story = {
  args: {
    workspace: "/Users/situ/sandbox/support-agent",
    onDownloadClick: () => undefined,
  },
  render: (args) => (
    <SituShell workspace="support-agent-demo">
      <NoActiveHarnessView {...args} />
    </SituShell>
  ),
};

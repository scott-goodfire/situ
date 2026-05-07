import { Text, useInput, useStdin } from "ink";
import { useState } from "react";
import {
  CommandInput,
  type CommandMessage,
} from "../command-input/command-input.js";
import { LayoutBox } from "../layout-box/layout-box.js";
import { PaneSection } from "../pane-section/pane-section.js";
import { previewText } from "../text-preview/text-preview.js";
import {
  MIN_DASHBOARD_HEIGHT,
  MIN_DASHBOARD_WIDTH,
  computeDashboardLayout,
} from "../fullscreen-dashboard/dashboard-layout.js";
import {
  DashboardFrame,
  DashboardFrameFooter,
  DashboardFrameSection,
} from "../fullscreen-dashboard/dashboard-frame.js";
import {
  useTerminalSize,
  type TerminalSize,
} from "../fullscreen-dashboard/use-terminal-size.js";

export function SecretSetupPrompt({
  workspace,
  isActive = true,
  message,
  onSubmit,
  onExit,
  terminalSize,
}: {
  workspace: string;
  isActive?: boolean;
  message?: CommandMessage;
  onSubmit: ({ openaiKey }: { openaiKey: string }) => void;
  onExit: () => void;
  terminalSize?: TerminalSize;
}) {
  const [draft, setDraft] = useState("");
  const [localMessage, setLocalMessage] = useState<CommandMessage | undefined>(
    undefined,
  );
  const detectedTerminalSize = useTerminalSize();
  const effectiveTerminalSize = terminalSize ?? detectedTerminalSize;
  const layout = computeDashboardLayout({
    columns: effectiveTerminalSize.columns,
    rows: effectiveTerminalSize.rows,
  });

  if (layout.mode === "too-small") {
    return (
      <SmallTerminalNotice
        width={layout.width}
        height={layout.height}
        onCancel={onExit}
      />
    );
  }

  const sectionHeight = Math.max(1, layout.height - layout.headerHeight - 3);

  return (
    <DashboardFrame
      title={`SITU / ${workspaceName({ workspace })} / setup`}
      width={layout.width}
      height={layout.height}
      footer={
        <DashboardFrameFooter
          label="Enter saves - Esc clears/exits"
          width={layout.width}
        />
      }
    >
      <DashboardFrameSection width={layout.width} height={layout.headerHeight}>
        <LayoutBox width={layout.contentWidth}>
          <Text>
            {previewText({
              value: "OpenAI API key required before agent execution",
              maxCharacters: Math.max(24, layout.contentWidth),
            })}
          </Text>
          <Text dimColor>
            {previewText({
              value: workspace,
              maxCharacters: Math.max(24, layout.contentWidth),
            })}
          </Text>
        </LayoutBox>
      </DashboardFrameSection>

      <DashboardFrameSection
        label="secret setup"
        width={layout.width}
        height={sectionHeight}
      >
        <LayoutBox width={layout.contentWidth} height={sectionHeight}>
          <PaneSection title="OpenAI API key" chrome="none">
            <Text>Paste your OpenAI API key to run Situ agents.</Text>
            <Text dimColor>
              It will be saved in local Situ runtime state and used for future
              sessions on this machine.
            </Text>
            <CommandInput
              draft={draft}
              isActive={isActive}
              mask="*"
              message={localMessage ?? message}
              onCancel={onExit}
              onChange={({ value }) => {
                setLocalMessage(undefined);
                setDraft(value);
              }}
              onSubmit={({ value }) => {
                const openaiKey = value.trim();
                if (!openaiKey) {
                  setLocalMessage({
                    tone: "yellow",
                    text: "Paste a key before continuing.",
                  });
                  return;
                }
                onSubmit({ openaiKey });
              }}
            />
          </PaneSection>
        </LayoutBox>
      </DashboardFrameSection>
    </DashboardFrame>
  );
}

function SmallTerminalNotice({
  width,
  height,
  onCancel,
}: {
  width: number;
  height: number;
  onCancel: () => void;
}) {
  const { isRawModeSupported } = useStdin();
  const canUseInput = Boolean(process.stdin.isTTY) && isRawModeSupported;
  const noticeWidth = Math.max(44, Math.min(width, 72));

  useInput(
    (input, key) => {
      if (input === "q" || key.escape) {
        onCancel();
      }
    },
    {
      isActive: canUseInput,
    },
  );

  return (
    <LayoutBox
      width={width}
      height={height}
      alignItems="center"
      justifyContent="center"
    >
      <PaneSection
        title="Please expand terminal"
        chrome="box"
        tone="warning"
        width={noticeWidth}
      >
        <Text>
          {`Situ needs at least ${MIN_DASHBOARD_WIDTH}x${MIN_DASHBOARD_HEIGHT} to render.`}
        </Text>
        <Text dimColor>Current size {width}x{height}</Text>
        <Text dimColor>Press q or Escape to exit.</Text>
      </PaneSection>
    </LayoutBox>
  );
}

function workspaceName({ workspace }: { workspace: string }): string {
  const parts = workspace.split("/").filter(Boolean);

  return parts[parts.length - 1] ?? workspace;
}

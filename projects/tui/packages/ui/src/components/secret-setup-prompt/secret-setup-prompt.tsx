import { Text, useInput, useStdin } from "ink";
import { useEffect, useState } from "react";
import { ChoicePrompt } from "../choice-prompt/choice-prompt.js";
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
  onSubmit: ({
    openaiKey,
    logfireToken,
  }: {
    openaiKey: string;
    logfireToken?: string;
  }) => void;
  onExit: () => void;
  terminalSize?: TerminalSize;
}) {
  const [step, setStep] = useState<"intro" | "openai" | "logfire">(() =>
    message ? "openai" : "intro",
  );
  const [openaiDraft, setOpenaiDraft] = useState("");
  const [logfireDraft, setLogfireDraft] = useState("");
  const [localMessage, setLocalMessage] = useState<CommandMessage | undefined>(
    undefined,
  );
  const detectedTerminalSize = useTerminalSize();
  const effectiveTerminalSize = terminalSize ?? detectedTerminalSize;
  const layout = computeDashboardLayout({
    columns: effectiveTerminalSize.columns,
    rows: effectiveTerminalSize.rows,
  });

  useEffect(() => {
    if (message) {
      setStep("openai");
    }
  }, [message]);

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
          label={
            step === "intro"
              ? "Enter OK - Esc exits"
              : step === "openai"
                ? "Enter continues - Esc clears/exits"
                : "Enter saves - Esc skips"
          }
          width={layout.width}
        />
      }
    >
      <DashboardFrameSection width={layout.width} height={layout.headerHeight}>
        <LayoutBox width={layout.contentWidth}>
          <Text>
            {previewText({
              value: "OpenAI required, Logfire optional",
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
          {step === "intro" ? (
            <PaneSection title="Local provider secrets" chrome="none">
              <Text>Situ needs an OpenAI API key before it can run agents.</Text>
              <Text dimColor>
                This local runtime uses secrets saved in Situ's secret store for
                future sessions on this machine. Logfire is optional.
              </Text>
              <ChoicePrompt
                title="Continue"
                message="Press Enter to paste local run secrets now."
                options={[
                  {
                    label: "OK",
                    value: "ok",
                  },
                ]}
                isActive={isActive}
                onCancel={onExit}
                onSelect={() => {
                  setStep("openai");
                }}
              />
            </PaneSection>
          ) : step === "openai" ? (
            <PaneSection title="OpenAI API key" chrome="none">
              <Text>Paste your OpenAI API key to run Situ agents.</Text>
              <Text dimColor>
                It will be saved in local Situ runtime state and used for future
                sessions on this machine.
              </Text>
              <CommandInput
                draft={openaiDraft}
                isActive={isActive}
                mask="*"
                message={localMessage ?? message}
                onCancel={onExit}
                onChange={({ value }) => {
                  setLocalMessage(undefined);
                  setOpenaiDraft(value);
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
                  setOpenaiDraft(openaiKey);
                  setLocalMessage(undefined);
                  setStep("logfire");
                }}
              />
            </PaneSection>
          ) : (
            <PaneSection title="Logfire token" chrome="none">
              <Text>Paste a Logfire write token for local run traces.</Text>
              <Text dimColor>
                This is optional. Leave it blank to run without remote Logfire
                export.
              </Text>
              <CommandInput
                draft={logfireDraft}
                isActive={isActive}
                mask="*"
                message={localMessage}
                onCancel={() => {
                  onSubmit({ openaiKey: openaiDraft });
                }}
                onChange={({ value }) => {
                  setLocalMessage(undefined);
                  setLogfireDraft(value);
                }}
                onSubmit={({ value }) => {
                  const logfireToken = value.trim();
                  onSubmit({
                    openaiKey: openaiDraft,
                    logfireToken: logfireToken || undefined,
                  });
                }}
              />
            </PaneSection>
          )}
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

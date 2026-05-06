import { Text, useInput, useStdin } from "ink";
import {
  ChoicePrompt,
  type ChoicePromptOption,
  type ChoicePromptSelection,
} from "../choice-prompt/choice-prompt.js";
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

export function FramedChoicePrompt({
  workspace,
  frameStatus,
  sectionLabel,
  statusLine,
  subtitle,
  title,
  message,
  options,
  initialIndex,
  isActive = true,
  footerLabel,
  onCancel,
  onSelect,
  terminalSize,
}: {
  workspace: string;
  frameStatus: string;
  sectionLabel: string;
  statusLine: string;
  subtitle?: string;
  title: string;
  message?: string;
  options: ChoicePromptOption[];
  initialIndex?: number;
  isActive?: boolean;
  footerLabel: string;
  onCancel: () => void;
  onSelect: ({ option, index }: ChoicePromptSelection) => void;
  terminalSize?: TerminalSize;
}) {
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
        onCancel={onCancel}
      />
    );
  }

  const promptHeight = Math.max(1, layout.height - layout.headerHeight - 3);

  return (
    <DashboardFrame
      title={frameTitle({ workspace, frameStatus })}
      width={layout.width}
      height={layout.height}
      footer={
        <DashboardFrameFooter label={footerLabel} width={layout.width} />
      }
    >
      <DashboardFrameSection width={layout.width} height={layout.headerHeight}>
        <FramedChoiceHeader
          width={layout.contentWidth}
          statusLine={statusLine}
          subtitle={subtitle}
        />
      </DashboardFrameSection>

      <DashboardFrameSection
        label={sectionLabel}
        width={layout.width}
        height={promptHeight}
      >
        <LayoutBox width={layout.contentWidth} height={promptHeight}>
          <ChoicePrompt
            title={title}
            message={message}
            options={options}
            initialIndex={initialIndex}
            isActive={isActive}
            onCancel={onCancel}
            onSelect={onSelect}
          />
        </LayoutBox>
      </DashboardFrameSection>
    </DashboardFrame>
  );
}

function FramedChoiceHeader({
  width,
  statusLine,
  subtitle,
}: {
  width: number;
  statusLine: string;
  subtitle: string | undefined;
}) {
  return (
    <LayoutBox width={width}>
      <Text>
        {previewText({
          value: statusLine,
          maxCharacters: Math.max(24, width),
        })}
      </Text>
      <Text dimColor>
        {previewText({
          value: subtitle ?? " ",
          maxCharacters: Math.max(24, width),
        })}
      </Text>
    </LayoutBox>
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

function frameTitle({
  workspace,
  frameStatus,
}: {
  workspace: string;
  frameStatus: string;
}): string {
  return `SITU / ${workspaceName({ workspace })} / ${frameStatus}`;
}

function workspaceName({ workspace }: { workspace: string }): string {
  const parts = workspace.split("/").filter(Boolean);

  return parts[parts.length - 1] ?? workspace;
}

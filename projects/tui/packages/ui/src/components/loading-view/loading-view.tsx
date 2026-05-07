import { Text, useInput, useStdin } from "ink";
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

export function LoadingView({
  workspace,
  frameStatus = "loading",
  title = "Loading...",
  detail,
  footerLabel = "Loading workspace state... · q quit",
  onExit,
  terminalSize,
}: {
  workspace: string;
  frameStatus?: string;
  title?: string;
  detail?: string;
  footerLabel?: string;
  onExit: () => void;
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
        onCancel={onExit}
      />
    );
  }

  const bodyHeight = Math.max(1, layout.height - 2);

  return (
    <DashboardFrame
      title={`SITU / ${workspaceName({ workspace })} / ${frameStatus}`}
      width={layout.width}
      height={layout.height}
      footer={
        <DashboardFrameFooter
          label={footerLabel}
          width={layout.width}
        />
      }
    >
      <DashboardFrameSection width={layout.width} height={bodyHeight}>
        <LayoutBox
          width={layout.contentWidth}
          height={bodyHeight}
          alignItems="center"
          justifyContent="center"
        >
          <Text color="cyan" bold>
            {title}
          </Text>
          {detail && (
            <Text dimColor>
              {previewText({
                value: detail,
                maxCharacters: Math.max(24, layout.contentWidth),
              })}
            </Text>
          )}
        </LayoutBox>
      </DashboardFrameSection>
      <LoadingControls onExit={onExit} />
    </DashboardFrame>
  );
}

function LoadingControls({ onExit }: { onExit: () => void }) {
  const { isRawModeSupported } = useStdin();
  const canUseInput = Boolean(process.stdin.isTTY) && isRawModeSupported;

  useInput(
    (input, key) => {
      if (input === "q" || key.escape) {
        onExit();
      }
    },
    {
      isActive: canUseInput,
    },
  );

  return null;
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

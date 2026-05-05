import { Text, useStdout } from "ink";
import type { ReactNode } from "react";
import { LayoutBox } from "../layout-box/layout-box.js";
import { PaneSection } from "../pane-section/pane-section.js";

export function AppFrame({
  workspace,
  statusLine,
  children,
  footer,
}: {
  workspace: string;
  statusLine: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const { stdout } = useStdout();
  const width = frameWidth({ columns: stdout.columns });

  return (
    <LayoutBox width={width} gap={1}>
      <HeaderBanner
        workspace={workspace}
        statusLine={statusLine}
        width={width}
      />

      <LayoutBox gap={1} paddingX={1}>
        {children}
      </LayoutBox>

      <LayoutBox paddingX={1}>{footer}</LayoutBox>
    </LayoutBox>
  );
}

function HeaderBanner({
  workspace,
  statusLine,
  width,
}: {
  workspace: string;
  statusLine: string;
  width: number;
}) {
  return (
    <PaneSection
      title="Almanac"
      chrome="box"
      tone="accent"
      width={width}
    >
      <Text dimColor>{workspace}</Text>
      <Text>{statusLine}</Text>
    </PaneSection>
  );
}

function frameWidth({ columns }: { columns: number | undefined }): number {
  if (!columns) {
    return 96;
  }

  const availableColumns = Math.max(columns - 2, 36);

  return Math.min(availableColumns, 112);
}

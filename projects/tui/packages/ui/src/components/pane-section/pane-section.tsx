import { Box, Text } from "ink";
import type { ReactNode } from "react";

export type PaneSectionChrome = "none" | "rule" | "box";
export type PaneSectionTone = "default" | "accent" | "muted" | "warning" | "danger";
export type PaneSectionDensity = "compact" | "normal";

export type PaneSectionProps = {
  title?: string;
  meta?: string;
  children: ReactNode;
  footer?: ReactNode;
  chrome?: PaneSectionChrome;
  tone?: PaneSectionTone;
  density?: PaneSectionDensity;
  width?: number;
  height?: number;
  flexGrow?: number;
};

export function PaneSection({
  title,
  meta,
  children,
  footer,
  chrome = "none",
  tone = "default",
  density = "normal",
  width,
  height,
  flexGrow,
}: PaneSectionProps) {
  const titleColor = titleColorForTone({ tone });
  const borderColor = borderColorForTone({ tone });
  const paddingX = density === "compact" ? 0 : 1;
  const rule = ruleText({ width });

  if (chrome === "box") {
    return (
      <Box
        borderStyle="round"
        borderColor={borderColor}
        flexDirection="column"
        paddingX={paddingX}
        width={width}
        height={height}
        flexGrow={flexGrow}
      >
        <PaneSectionHeader title={title} meta={meta} titleColor={titleColor} />
        {children}
        {footer && <Box marginTop={1}>{footer}</Box>}
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      flexGrow={flexGrow}
    >
      <PaneSectionHeader title={title} meta={meta} titleColor={titleColor} />
      {chrome === "rule" && <Text color={borderColor}>{rule}</Text>}
      {children}
      {footer && <Box marginTop={1}>{footer}</Box>}
    </Box>
  );
}

function PaneSectionHeader({
  title,
  meta,
  titleColor,
}: {
  title: string | undefined;
  meta: string | undefined;
  titleColor: string;
}) {
  if (!title) {
    return null;
  }

  return (
    <Text color={titleColor} bold>
      {title}
      {meta && <Text color="gray"> {meta}</Text>}
    </Text>
  );
}

function titleColorForTone({ tone }: { tone: PaneSectionTone }): string {
  if (tone === "accent") {
    return "cyan";
  }

  if (tone === "muted") {
    return "gray";
  }

  if (tone === "warning") {
    return "yellow";
  }

  if (tone === "danger") {
    return "red";
  }

  return "cyan";
}

function borderColorForTone({ tone }: { tone: PaneSectionTone }): string {
  if (tone === "accent") {
    return "cyan";
  }

  if (tone === "warning") {
    return "yellow";
  }

  if (tone === "danger") {
    return "red";
  }

  return "gray";
}

function ruleText({ width }: { width: number | undefined }): string {
  const ruleWidth = Math.max(8, Math.min(width ?? 64, 160));

  return "─".repeat(ruleWidth);
}

import { Box, Text } from "ink";
import type { ReactNode } from "react";
import { LayoutBox } from "../layout-box/layout-box.js";
import { previewText } from "../text-preview/text-preview.js";

export type DashboardFrameTone = "gray" | "cyan" | "yellow" | "red" | "green";

export function DashboardFrame({
  children,
  footer,
  title,
  width,
  height,
}: {
  children: ReactNode;
  footer: ReactNode;
  title: string;
  width: number;
  height: number;
}) {
  return (
    <LayoutBox width={width} height={height}>
      <FrameDivider kind="top" label={title} width={width} />
      {children}
      {footer}
    </LayoutBox>
  );
}

export function DashboardFrameSection({
  children,
  height,
  label,
  width,
}: {
  children: ReactNode;
  height: number;
  label?: string;
  width: number;
}) {
  return (
    <>
      {label && <FrameDivider kind="middle" label={label} width={width} />}
      <Box
        flexDirection="row"
        height={height}
        width={width}
      >
        <VerticalFrameBorder height={height} />
        <Box
          flexDirection="column"
          height={height}
          paddingX={1}
          width={Math.max(0, width - 2)}
        >
          {children}
        </Box>
        <VerticalFrameBorder height={height} />
      </Box>
    </>
  );
}

export function DashboardFrameFooter({
  label,
  tone,
  width,
}: {
  label: string;
  tone?: DashboardFrameTone;
  width: number;
}) {
  return (
    <FrameDivider
      kind="bottom"
      label={label}
      tone={tone}
      width={width}
    />
  );
}

function FrameDivider({
  kind,
  label,
  width,
  tone,
}: {
  kind: "top" | "middle" | "bottom";
  label: string;
  width: number;
  tone?: DashboardFrameTone;
}) {
  const line = frameDividerLine({
    kind,
    label,
    width,
  });

  if (tone && tone !== "gray") {
    return <Text color={tone}>{line}</Text>;
  }

  return <Text dimColor>{line}</Text>;
}

function VerticalFrameBorder({ height }: { height: number }) {
  return (
    <Box flexDirection="column" height={height} width={1}>
      {Array.from({ length: Math.max(0, height) }, (_, index) => (
        <Text key={index} dimColor>
          │
        </Text>
      ))}
    </Box>
  );
}

function frameDividerLine({
  kind,
  label,
  width,
}: {
  kind: "top" | "middle" | "bottom";
  label: string;
  width: number;
}): string {
  const left = kind === "top" ? "┌" : kind === "bottom" ? "└" : "├";
  const right = kind === "top" ? "┐" : kind === "bottom" ? "┘" : "┤";
  const innerWidth = Math.max(0, width - 2);
  const labelWidth = Math.max(1, innerWidth - 2);
  const fittedLabel = previewText({
    value: label.trim(),
    maxCharacters: labelWidth,
  });
  const labelText = fittedLabel ? ` ${fittedLabel} ` : "";
  const ruleWidth = Math.max(0, innerWidth - labelText.length);

  return `${left}${labelText}${"─".repeat(ruleWidth)}${right}`;
}

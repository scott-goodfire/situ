import { Box } from "ink";
import type { ReactNode } from "react";

export type LayoutBoxDirection = "column" | "row";
export type LayoutBoxAlignItems =
  | "flex-start"
  | "center"
  | "flex-end"
  | "stretch";
export type LayoutBoxJustifyContent =
  | "flex-start"
  | "center"
  | "flex-end"
  | "space-between"
  | "space-around";

export type LayoutBoxProps = {
  children: ReactNode;
  direction?: LayoutBoxDirection;
  alignItems?: LayoutBoxAlignItems;
  justifyContent?: LayoutBoxJustifyContent;
  width?: number;
  height?: number;
  flexGrow?: number;
  gap?: number;
  paddingX?: number;
  paddingY?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
};

export function LayoutBox({
  children,
  direction = "column",
  alignItems,
  justifyContent,
  width,
  height,
  flexGrow,
  gap,
  paddingX,
  paddingY,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
}: LayoutBoxProps) {
  return (
    <Box
      flexDirection={direction}
      alignItems={alignItems}
      justifyContent={justifyContent}
      width={width}
      height={height}
      flexGrow={flexGrow}
      gap={gap}
      paddingX={paddingX}
      paddingY={paddingY}
      marginTop={marginTop}
      marginBottom={marginBottom}
      marginLeft={marginLeft}
      marginRight={marginRight}
    >
      {children}
    </Box>
  );
}

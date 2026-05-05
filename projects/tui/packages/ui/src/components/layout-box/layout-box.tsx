import { Box } from "ink";
import type { ReactNode } from "react";

export type LayoutBoxDirection = "column" | "row";

export type LayoutBoxProps = {
  children: ReactNode;
  direction?: LayoutBoxDirection;
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

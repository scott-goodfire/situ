import { Box, Text } from "ink";
import type { ReactNode } from "react";

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>
        {title}
      </Text>
      {children}
    </Box>
  );
}

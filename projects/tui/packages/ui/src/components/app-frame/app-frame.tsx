import { Box, Text, useStdout } from "ink";
import type { ReactNode } from "react";

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
  const dividerWidth = Math.max(width - 6, 12);

  return (
    <Box width={width} borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1}>
      <Box flexDirection="column">
        <Text color="cyan" bold>
          Almanac
        </Text>
        <Text dimColor>{workspace}</Text>
        <Text>{statusLine}</Text>
      </Box>

      <Divider width={dividerWidth} />

      <Box flexDirection="column" gap={1}>
        {children}
      </Box>

      <Divider width={dividerWidth} />

      {footer}
    </Box>
  );
}

function Divider({ width }: { width: number }) {
  return <Text dimColor>{"-".repeat(width)}</Text>;
}

function frameWidth({ columns }: { columns: number | undefined }): number {
  if (!columns) {
    return 96;
  }

  const availableColumns = Math.max(columns - 2, 36);

  return Math.min(availableColumns, 112);
}

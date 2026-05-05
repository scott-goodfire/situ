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

  return (
    <Box width={width} flexDirection="column" gap={1}>
      <HeaderBanner
        workspace={workspace}
        statusLine={statusLine}
        width={width}
      />

      <Box flexDirection="column" gap={1} paddingX={1}>
        {children}
      </Box>

      <Box paddingX={1}>{footer}</Box>
    </Box>
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
    <Box
      width={width}
      borderStyle="round"
      borderColor="cyan"
      flexDirection="column"
      paddingX={1}
    >
      <Text color="cyan" bold>
        Almanac
      </Text>
      <Text dimColor>{workspace}</Text>
      <Text>{statusLine}</Text>
    </Box>
  );
}

function frameWidth({ columns }: { columns: number | undefined }): number {
  if (!columns) {
    return 96;
  }

  const availableColumns = Math.max(columns - 2, 36);

  return Math.min(availableColumns, 112);
}

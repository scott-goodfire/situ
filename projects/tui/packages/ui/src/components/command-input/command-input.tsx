import { Box, Text, useInput, useStdin } from "ink";

export type CommandMessage = {
  text: string;
  tone: "gray" | "cyan" | "yellow" | "red";
};

export function CommandInput({
  draft,
  message,
  onChange,
  onSubmit,
}: {
  draft: string;
  message: CommandMessage | undefined;
  onChange: ({ value }: { value: string }) => void;
  onSubmit: ({ value }: { value: string }) => void;
}) {
  const { isRawModeSupported } = useStdin();
  const canUseInput = Boolean(process.stdin.isTTY) && isRawModeSupported;

  useInput((input, key) => {
    if (key.return) {
      onSubmit({ value: draft });
      return;
    }

    if (key.escape) {
      onChange({ value: "" });
      return;
    }

    if (key.backspace || key.delete) {
      onChange({ value: draft.slice(0, -1) });
      return;
    }

    if (key.ctrl || key.meta) {
      return;
    }

    if (!input) {
      return;
    }

    onChange({ value: `${draft}${input}` });
  }, { isActive: canUseInput });

  return (
    <Box flexDirection="column">
      {message && <Text color={message.tone}>{message.text}</Text>}
      <Text>
        <Text color="cyan">{"> "}</Text>
        {draft}
        <Text inverse> </Text>
      </Text>
    </Box>
  );
}

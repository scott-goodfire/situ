import { Box, Text, useInput, useStdin } from "ink";

export type CommandMessage = {
  text: string;
  tone: "gray" | "cyan" | "yellow" | "red";
};

export function CommandInput({
  draft,
  isActive = true,
  mask,
  message,
  onCancel,
  onChange,
  onSubmit,
}: {
  draft: string;
  isActive?: boolean;
  mask?: string;
  message: CommandMessage | undefined;
  onCancel?: () => void;
  onChange: ({ value }: { value: string }) => void;
  onSubmit: ({ value }: { value: string }) => void;
}) {
  const { isRawModeSupported } = useStdin();
  const canUseInput = Boolean(process.stdin.isTTY) && isRawModeSupported;

  useInput((input, key) => {
    if (key.return || input === "\r" || input === "\n") {
      onSubmit({ value: draft });
      return;
    }

    if (key.escape) {
      if (!draft && onCancel) {
        onCancel();
        return;
      }

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

    if (hasControlCharacter({ input })) {
      return;
    }

    onChange({ value: `${draft}${input}` });
  }, { isActive: isActive && canUseInput });

  const renderedDraft = mask ? maskedDraft({ draft, mask }) : draft;

  return (
    <Box flexDirection="column">
      {message && <Text color={message.tone}>{message.text}</Text>}
      <Text>
        <Text color="cyan">{"> "}</Text>
        {renderedDraft}
        <Text inverse> </Text>
      </Text>
    </Box>
  );
}

function maskedDraft({ draft, mask }: { draft: string; mask: string }): string {
  if (!draft) {
    return "";
  }

  return mask.repeat(Math.min(draft.length, 64));
}

function hasControlCharacter({ input }: { input: string }): boolean {
  return /[\x00-\x1F\x7F]/.test(input);
}

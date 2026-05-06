import { Box, Text, useInput, useStdin } from "ink";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  ChoicePrompt,
  type ChoicePromptOption,
  type ChoicePromptSelection,
} from "../choice-prompt/choice-prompt.js";

export type DashboardCommand = "status" | "help" | "quit";

export type DashboardControlMessage = {
  text: string;
  tone: "gray" | "cyan" | "yellow" | "red";
};

const commandOptions = [
  {
    label: "Status",
    value: "status",
    description: "Show the current session status.",
  },
  {
    label: "Help",
    value: "help",
    description: "Show dashboard keyboard controls.",
  },
  {
    label: "Quit",
    value: "quit",
    description: "Close the terminal dashboard.",
  },
] satisfies ChoicePromptOption[];

export function DashboardControls({
  initialMode = "idle",
  idleRenderer,
  message,
  onCommand,
}: {
  initialMode?: "idle" | "commands";
  idleRenderer?: ({
    label,
    message,
  }: {
    label: string;
    message: DashboardControlMessage | undefined;
  }) => ReactNode;
  message: DashboardControlMessage | undefined;
  onCommand: ({ command }: { command: DashboardCommand }) => void;
}) {
  const [mode, setMode] = useState<"idle" | "commands">(initialMode);
  const { isRawModeSupported } = useStdin();
  const canUseInput = Boolean(process.stdin.isTTY) && isRawModeSupported;

  useInput(
    (input) => {
      if (input === "?") {
        onCommand({ command: "help" });
        return;
      }

      if (input === ":") {
        setMode("commands");
        return;
      }

      if (input === "q") {
        onCommand({ command: "quit" });
      }
    },
    {
      isActive: canUseInput && mode === "idle",
    },
  );

  if (mode === "commands") {
    return (
      <Box flexDirection="column">
        {message && <Text color={message.tone}>{message.text}</Text>}
        <ChoicePrompt
          title="Commands"
          message="Choose a dashboard command."
          options={commandOptions}
          onCancel={() => {
            setMode("idle");
          }}
          onSelect={({ option }) => {
            handleCommandSelection({
              option,
              setMode,
              onCommand,
            });
          }}
        />
        <Text dimColor>Enter selects. Escape closes commands.</Text>
      </Box>
    );
  }

  if (idleRenderer) {
    return <>{idleRenderer({ label: controlLabel(), message })}</>;
  }

  return (
    <Box flexDirection="column">
      {message && <Text color={message.tone}>{message.text}</Text>}
      <Text dimColor>{controlLabel()}</Text>
    </Box>
  );
}

function controlLabel(): string {
  return "? help · : commands · q quit";
}

function handleCommandSelection({
  option,
  setMode,
  onCommand,
}: {
  option: ChoicePromptSelection["option"];
  setMode: (mode: "idle" | "commands") => void;
  onCommand: ({ command }: { command: DashboardCommand }) => void;
}) {
  setMode("idle");

  if (option.value === "status") {
    onCommand({ command: "status" });
    return;
  }

  if (option.value === "help") {
    onCommand({ command: "help" });
    return;
  }

  onCommand({ command: "quit" });
}

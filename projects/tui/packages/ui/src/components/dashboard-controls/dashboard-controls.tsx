import { Box, Text, useInput, useStdin } from "ink";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  ChoicePrompt,
  type ChoicePromptOption,
  type ChoicePromptSelection,
} from "../choice-prompt/choice-prompt.js";

export type DashboardCommand = "status" | "help" | "quit";
export type DashboardControlMode = "idle" | "commands" | "help" | "search";

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
  mode,
  onModeChange,
  onCommand,
  renderCommandsInPlace = false,
}: {
  initialMode?: DashboardControlMode;
  idleRenderer?: ({
    label,
    message,
  }: {
    label: string;
    message: DashboardControlMessage | undefined;
  }) => ReactNode;
  message: DashboardControlMessage | undefined;
  mode?: DashboardControlMode;
  onModeChange?: (mode: DashboardControlMode) => void;
  onCommand: ({ command }: { command: DashboardCommand }) => void;
  renderCommandsInPlace?: boolean;
}) {
  const [internalMode, setInternalMode] =
    useState<DashboardControlMode>(initialMode);
  const controlMode = mode ?? internalMode;
  const setMode = onModeChange ?? setInternalMode;
  const { isRawModeSupported } = useStdin();
  const canUseInput = Boolean(process.stdin.isTTY) && isRawModeSupported;

  useInput(
    (input) => {
      if (input === "?") {
        setMode("help");
        return;
      }

      if (input === "/") {
        setMode("search");
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
      isActive: canUseInput && controlMode === "idle",
    },
  );

  if (controlMode !== "idle" && renderCommandsInPlace) {
    const label = footerLabelForMode({ mode: controlMode });

    if (idleRenderer) {
      return <>{idleRenderer({ label, message })}</>;
    }

    return (
      <Box flexDirection="column">
        {message && <Text color={message.tone}>{message.text}</Text>}
        <Text dimColor>{label}</Text>
      </Box>
    );
  }

  if (controlMode === "commands") {
    return (
      <DashboardCommandPicker
        message={message}
        onCancel={() => {
          setMode("idle");
        }}
        onCommand={({ command }) => {
          setMode("idle");
          onCommand({ command });
        }}
      />
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
  return "? help · / search · : commands · q quit";
}

function footerLabelForMode({ mode }: { mode: DashboardControlMode }): string {
  if (mode === "commands") {
    return "Enter selects · Esc closes commands";
  }

  if (mode === "help") {
    return "? or Esc closes help";
  }

  if (mode === "search") {
    return "Type to filter · Enter applies · Esc clears";
  }

  return controlLabel();
}

export function DashboardCommandPicker({
  message,
  onCancel,
  onCommand,
  showHint = true,
}: {
  message: DashboardControlMessage | undefined;
  onCancel: () => void;
  onCommand: ({ command }: { command: DashboardCommand }) => void;
  showHint?: boolean;
}) {
  return (
    <Box flexDirection="column">
      {message && <Text color={message.tone}>{message.text}</Text>}
      <ChoicePrompt
        title="Commands"
        message="Choose a dashboard command."
        options={commandOptions}
        onCancel={onCancel}
        onSelect={({ option }) => {
          handleCommandSelection({
            option,
            onCommand,
          });
        }}
      />
      {showHint && <Text dimColor>{footerLabelForMode({ mode: "commands" })}</Text>}
    </Box>
  );
}

function handleCommandSelection({
  option,
  onCommand,
}: {
  option: ChoicePromptSelection["option"];
  onCommand: ({ command }: { command: DashboardCommand }) => void;
}) {
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

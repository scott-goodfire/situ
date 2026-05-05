import { Text } from "ink";
import type { SessionStartParams } from "@almanac/protocol";
import { AppFrame } from "../app-frame/app-frame.js";
import {
  ChoicePrompt,
  type ChoicePromptOption,
  type ChoicePromptSelection,
} from "../choice-prompt/choice-prompt.js";

const startOptions = [
  {
    label: "Start session",
    value: "start",
    description: "Create a fresh session and let the agent begin.",
  },
  {
    label: "Exit",
    value: "exit",
    description: "Close without starting any research work.",
  },
] satisfies ChoicePromptOption[];

export function StartSessionPrompt({
  workspace,
  params,
  isActive = true,
  onStart,
  onExit,
}: {
  workspace: string;
  params: SessionStartParams;
  isActive?: boolean;
  onStart: () => void;
  onExit: () => void;
}) {
  return (
    <AppFrame
      workspace={workspace}
      statusLine="Ready to start a fresh session"
      footer={<Text dimColor>Enter selects. Escape exits.</Text>}
    >
      <ChoicePrompt
        title="Start autoresearch session?"
        message={startMessage({ params })}
        options={startOptions}
        isActive={isActive}
        onCancel={onExit}
        onSelect={({ option }) => {
          handleStartSelection({
            option,
            onStart,
            onExit,
          });
        }}
      />
    </AppFrame>
  );
}

function startMessage({ params }: { params: SessionStartParams }): string {
  return [
    `Objective: ${params.objective}`,
    `Budget: ${params.max_experiments ?? 6} experiments`,
    `Context: ${params.research_context}`,
  ].join("\n");
}

function handleStartSelection({
  option,
  onStart,
  onExit,
}: {
  option: ChoicePromptSelection["option"];
  onStart: () => void;
  onExit: () => void;
}) {
  if (option.value === "start") {
    onStart();
    return;
  }

  onExit();
}

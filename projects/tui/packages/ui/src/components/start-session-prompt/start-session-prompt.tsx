import type { SessionStartParams } from "@situ/protocol";
import {
  type ChoicePromptOption,
  type ChoicePromptSelection,
} from "../choice-prompt/choice-prompt.js";
import { FramedChoicePrompt } from "../framed-choice-prompt/framed-choice-prompt.js";
import type { TerminalSize } from "../fullscreen-dashboard/use-terminal-size.js";

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
  terminalSize,
}: {
  workspace: string;
  params: SessionStartParams;
  isActive?: boolean;
  onStart: () => void;
  onExit: () => void;
  terminalSize?: TerminalSize;
}) {
  return (
    <FramedChoicePrompt
      workspace={workspace}
      frameStatus="ready"
      sectionLabel="start"
      statusLine="ready · Ready to start a fresh session"
      subtitle={workspace}
      title="Start autoresearch session?"
      message={startMessage({ params })}
      options={startOptions}
      isActive={isActive}
      footerLabel="Enter selects · Esc exits"
      onCancel={onExit}
      onSelect={({ option }) => {
        handleStartSelection({
          option,
          onStart,
          onExit,
        });
      }}
      terminalSize={terminalSize}
    />
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

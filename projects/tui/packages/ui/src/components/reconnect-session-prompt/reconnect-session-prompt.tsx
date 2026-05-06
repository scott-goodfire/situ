import type { ProjectRecord, SessionRecord } from "@situ/protocol";
import {
  type ChoicePromptOption,
  type ChoicePromptSelection,
} from "../choice-prompt/choice-prompt.js";
import { FramedChoicePrompt } from "../framed-choice-prompt/framed-choice-prompt.js";
import type { TerminalSize } from "../fullscreen-dashboard/use-terminal-size.js";

const reconnectOptions = [
  {
    label: "Reconnect",
    value: "reconnect",
    description: "Open the live session dashboard.",
  },
  {
    label: "Quit",
    value: "quit",
    description: "Close without opening the dashboard.",
  },
] satisfies ChoicePromptOption[];

export function ReconnectSessionPrompt({
  workspace,
  session,
  project,
  experimentCount,
  maxExperiments,
  onReconnect,
  onQuit,
  terminalSize,
}: {
  workspace: string;
  session: SessionRecord;
  project: ProjectRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
  onReconnect: () => void;
  onQuit: () => void;
  terminalSize?: TerminalSize;
}) {
  return (
    <FramedChoicePrompt
      workspace={workspace}
      frameStatus={`${session.id} active`}
      sectionLabel="reconnect"
      statusLine="active session · Reconnect to continue watching this run"
      subtitle={workspace}
      title="Reconnect to active session?"
      message={reconnectMessage({
        session,
        project,
        experimentCount,
        maxExperiments,
      })}
      options={reconnectOptions}
      footerLabel="Enter selects · Esc quits"
      onCancel={onQuit}
      onSelect={({ option }) => {
        handleReconnectSelection({
          option,
          onReconnect,
          onQuit,
        });
      }}
      terminalSize={terminalSize}
    />
  );
}

function reconnectMessage({
  session,
  project,
  experimentCount,
  maxExperiments,
}: {
  session: SessionRecord;
  project: ProjectRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
}): string {
  const objectiveLabel = project?.objective ?? "(no objective)";

  return [
    `Session: ${session.id}`,
    `Objective: ${objectiveLabel}`,
    `Experiments: ${experimentCount}/${maxExperiments}`,
  ].join("\n");
}

function handleReconnectSelection({
  option,
  onReconnect,
  onQuit,
}: {
  option: ChoicePromptSelection["option"];
  onReconnect: () => void;
  onQuit: () => void;
}) {
  if (option.value === "reconnect") {
    onReconnect();
    return;
  }

  onQuit();
}

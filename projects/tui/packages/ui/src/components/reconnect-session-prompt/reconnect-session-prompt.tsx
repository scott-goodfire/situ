import { Text } from "ink";
import type { ObjectiveRecord, SessionRecord } from "@almanac/protocol";
import { AppFrame } from "../app-frame/app-frame.js";
import {
  ChoicePrompt,
  type ChoicePromptOption,
  type ChoicePromptSelection,
} from "../choice-prompt/choice-prompt.js";

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
  objective,
  experimentCount,
  maxExperiments,
  onReconnect,
  onQuit,
}: {
  workspace: string;
  session: SessionRecord;
  objective: ObjectiveRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
  onReconnect: () => void;
  onQuit: () => void;
}) {
  return (
    <AppFrame
      workspace={workspace}
      statusLine="Active session found"
      footer={<Text dimColor>Enter selects. Escape quits.</Text>}
    >
      <ChoicePrompt
        title="Reconnect to active session?"
        message={reconnectMessage({
          session,
          objective,
          experimentCount,
          maxExperiments,
        })}
        options={reconnectOptions}
        onCancel={onQuit}
        onSelect={({ option }) => {
          handleReconnectSelection({
            option,
            onReconnect,
            onQuit,
          });
        }}
      />
    </AppFrame>
  );
}

function reconnectMessage({
  session,
  objective,
  experimentCount,
  maxExperiments,
}: {
  session: SessionRecord;
  objective: ObjectiveRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
}): string {
  const objectiveLabel = objective?.title ?? session.objective_id;

  return `${session.id} is active for ${objectiveLabel}. Experiments ${experimentCount}/${maxExperiments}.`;
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

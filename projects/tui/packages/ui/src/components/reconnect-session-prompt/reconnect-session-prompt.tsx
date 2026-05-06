import { Text } from "ink";
import type { ProjectRecord, SessionRecord } from "@situ/protocol";
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
  project,
  experimentCount,
  maxExperiments,
  onReconnect,
  onQuit,
}: {
  workspace: string;
  session: SessionRecord;
  project: ProjectRecord | undefined;
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
          project,
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

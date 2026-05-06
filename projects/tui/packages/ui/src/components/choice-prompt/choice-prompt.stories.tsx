import { useState } from "react";
import { Text } from "ink";
import {
  ChoicePrompt,
  type ChoicePromptOption,
  type ChoicePromptSelection,
} from "./choice-prompt.js";
import { FramedChoicePrompt } from "../framed-choice-prompt/framed-choice-prompt.js";
import { storyWorkspace } from "../../fixtures/story-data.js";
import type { TuiStory } from "../../stories/story-types.js";

const nextActionOptions = [
  {
    label: "Continue current run",
    value: "continue",
    description: "Let the active experiment finish.",
  },
  {
    label: "Inspect suspicious result",
    value: "inspect",
    description: "Open the most recent concern before accepting anything.",
  },
  {
    label: "Pause after this experiment",
    value: "pause",
    description: "Stop proposing new work after the current attempt.",
  },
  {
    label: "Cancel run",
    value: "cancel",
    description: "Stop the session immediately.",
  },
] satisfies ChoicePromptOption[];

const compactOptions = [
  {
    label: "Reproduce best result",
    value: "reproduce",
  },
  {
    label: "Try a nearby combination",
    value: "combine",
  },
  {
    label: "Move to a new hypothesis",
    value: "new-hypothesis",
  },
] satisfies ChoicePromptOption[];

export const stories = [
  {
    id: "choice-prompt/next-action",
    title: "Choice Prompt",
    name: "next-action",
    render: () => (
      <ChoicePromptStory
        title="Choose next action"
        message="Use up/down or j/k, then press Enter."
        options={nextActionOptions}
        initialIndex={1}
      />
    ),
  },
  {
    id: "choice-prompt/compact",
    title: "Choice Prompt",
    name: "compact",
    render: () => (
      <ChoicePromptStory
        title="What should Situ do next?"
        options={compactOptions}
      />
    ),
  },
  {
    id: "choice-prompt/in-frame",
    title: "Choice Prompt",
    name: "in-frame",
    render: () => <FramedChoicePromptStory />,
  },
] satisfies TuiStory[];

function FramedChoicePromptStory() {
  return (
    <FramedChoicePrompt
      workspace={storyWorkspace}
      frameStatus="run_0001 needs input"
      sectionLabel="choice"
      statusLine="needs input · run_0001 · experiments 3/5"
      subtitle={storyWorkspace}
      title="Review suspicious improvement"
      message="exp_run_0001_fixture_edit touched eval fixtures."
      options={nextActionOptions}
      initialIndex={1}
      isActive={false}
      footerLabel="Enter selects · Esc cancels"
      onCancel={() => {}}
      onSelect={() => {}}
      terminalSize={{ columns: 112, rows: 34 }}
    />
  );
}

function ChoicePromptStory({
  title,
  message,
  options,
  initialIndex = 0,
}: {
  title: string;
  message?: string;
  options: ChoicePromptOption[];
  initialIndex?: number;
}) {
  const [resultText, setResultText] = useState("Waiting for selection.");

  return (
    <>
      <ChoicePrompt
        title={title}
        message={message}
        options={options}
        initialIndex={initialIndex}
        onSelect={({ option, index }) => {
          handleSelect({
            option,
            index,
            setResultText,
          });
        }}
        onCancel={() => {
          setResultText("Cancelled.");
        }}
      />
      <Text dimColor>{resultText}</Text>
    </>
  );
}

function handleSelect({
  option,
  index,
  setResultText,
}: ChoicePromptSelection & {
  setResultText: (value: string) => void;
}) {
  setResultText(`Selected ${index + 1}: ${option.label}`);
}

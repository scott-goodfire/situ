import { useState } from "react";
import { CommandInput, type CommandMessage } from "./command-input.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "command-input/ready",
    title: "Command Input",
    name: "ready",
    render: () => <CommandInputStory initialMessage="Type /help for commands." />,
  },
  {
    id: "command-input/status-message",
    title: "Command Input",
    name: "status-message",
    render: () => (
      <CommandInputStory
        initialDraft="/status"
        initialMessage="run_0001 | running | experiments 3/5"
      />
    ),
  },
] satisfies TuiStory[];

function CommandInputStory({
  initialDraft = "",
  initialMessage,
}: {
  initialDraft?: string;
  initialMessage: string;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [message, setMessage] = useState<CommandMessage>({
    tone: "gray",
    text: initialMessage,
  });

  return (
    <CommandInput
      draft={draft}
      message={message}
      onChange={({ value }) => {
        setDraft(value);
      }}
      onSubmit={({ value }) => {
        setDraft("");
        setMessage({
          tone: "cyan",
          text: `Submitted ${value.trim() || "empty command"}`,
        });
      }}
    />
  );
}

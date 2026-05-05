import { useState } from "react";
import {
  DashboardControls,
  type DashboardControlMessage,
} from "./dashboard-controls.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "dashboard-controls/idle",
    title: "Dashboard Controls",
    name: "idle",
    render: () => <DashboardControlsStory />,
  },
  {
    id: "dashboard-controls/status-message",
    title: "Dashboard Controls",
    name: "status-message",
    render: () => (
      <DashboardControlsStory
        initialMessage={{
          tone: "cyan",
          text: "session_0001 | active | experiments 3/5",
        }}
      />
    ),
  },
  {
    id: "dashboard-controls/commands",
    title: "Dashboard Controls",
    name: "commands",
    render: () => <DashboardControlsStory initialMode="commands" />,
  },
] satisfies TuiStory[];

function DashboardControlsStory({
  initialMode = "idle",
  initialMessage,
}: {
  initialMode?: "idle" | "commands";
  initialMessage?: DashboardControlMessage;
}) {
  const [message, setMessage] = useState<DashboardControlMessage | undefined>(
    initialMessage,
  );

  return (
    <DashboardControls
      initialMode={initialMode}
      message={message}
      onCommand={({ command }) => {
        if (command === "status") {
          setMessage({
            tone: "cyan",
            text: "session_0001 | active | experiments 3/5",
          });
          return;
        }

        if (command === "help") {
          setMessage({
            tone: "gray",
            text: "Keys: ? help, : commands, q quit.",
          });
          return;
        }

        setMessage({
          tone: "yellow",
          text: "Quit selected.",
        });
      }}
    />
  );
}

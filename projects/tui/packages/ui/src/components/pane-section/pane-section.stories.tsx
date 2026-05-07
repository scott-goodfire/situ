import { Box, Text } from "ink";
import { PaneSection } from "./pane-section.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "pane-section/default",
    title: "Pane Section",
    name: "default",
    render: () => (
      <PaneSection title="Run">
        <Text>run_0001 | running | experiments 3/5</Text>
      </PaneSection>
    ),
  },
  {
    id: "pane-section/meta",
    title: "Pane Section",
    name: "meta",
    render: () => (
      <PaneSection title="Hypotheses" meta="2 active">
        <Text>H1 | active | Retrieval filtering helps billing answers</Text>
        <Text>H2 | open | Cancellation tickets need a separate path</Text>
      </PaneSection>
    ),
  },
  {
    id: "pane-section/rule",
    title: "Pane Section",
    name: "rule",
    render: () => (
      <PaneSection title="Recent Activity" meta="3 items" chrome="rule" width={72}>
        <Text>result | baseline resolution 61.0%</Text>
        <Text>concern | result missing hallucination_rate signal</Text>
        <Text>update | cancellation tickets remain weakest</Text>
      </PaneSection>
    ),
  },
  {
    id: "pane-section/box",
    title: "Pane Section",
    name: "box",
    render: () => (
      <PaneSection
        title="Reconnect"
        meta="active session found"
        chrome="box"
        tone="accent"
        width={72}
      >
        <Text>S1 is active for support-agent evals.</Text>
        <Text dimColor>Enter reconnects. Escape quits.</Text>
      </PaneSection>
    ),
  },
  {
    id: "pane-section/composed",
    title: "Pane Section",
    name: "composed",
    render: () => (
      <Box flexDirection="column" gap={1} width={72}>
        <PaneSection title="Now">
          <Text>E2 | active</Text>
        </PaneSection>
        <PaneSection title="Trust Checks" chrome="box" tone="warning" density="compact">
          <Text>concern | eval command changed during candidate run</Text>
        </PaneSection>
      </Box>
    ),
  },
] satisfies TuiStory[];

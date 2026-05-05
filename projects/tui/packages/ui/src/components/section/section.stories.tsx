import { Text } from "ink";
import { Section } from "./section.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "section/default",
    title: "Section",
    name: "default",
    render: () => (
      <Section title="Run">
        <Text>run_0001 | running | experiments 3/5</Text>
      </Section>
    ),
  },
  {
    id: "section/empty",
    title: "Section",
    name: "empty",
    render: () => (
      <Section title="Timeline">
        <Text dimColor>No events yet</Text>
      </Section>
    ),
  },
] satisfies TuiStory[];

import { Text } from "ink";
import { LayoutBox } from "./layout-box.js";
import { PaneSection } from "../pane-section/pane-section.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "layout-box/column",
    title: "Layout Box",
    name: "column",
    render: () => (
      <LayoutBox gap={1} width={72}>
        <PaneSection title="Session">
          <Text>S1 | active | experiments 3/5</Text>
        </PaneSection>
        <PaneSection title="Now">
          <Text>E2 | active</Text>
        </PaneSection>
      </LayoutBox>
    ),
  },
  {
    id: "layout-box/row",
    title: "Layout Box",
    name: "row",
    render: () => (
      <LayoutBox direction="row" gap={2} width={80}>
        <PaneSection title="Left" chrome="box" width={32}>
          <Text>objective</Text>
          <Text>hypotheses</Text>
        </PaneSection>
        <PaneSection title="Right" chrome="box" width={32}>
          <Text>experiments</Text>
          <Text>events</Text>
        </PaneSection>
      </LayoutBox>
    ),
  },
] satisfies TuiStory[];

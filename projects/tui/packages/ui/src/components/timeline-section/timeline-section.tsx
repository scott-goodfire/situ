import { Text } from "ink";
import type { EventRecord } from "@almanac/protocol";
import { Section } from "../section/section.js";
import { previewText } from "../text-preview/text-preview.js";

export function TimelineSection({ events }: { events: EventRecord[] }) {
  const visibleEvents = events.slice(-8);

  return (
    <Section title="Events">
      {visibleEvents.length === 0 && <Text dimColor>No events yet</Text>}
      {visibleEvents.map((event) => (
        <Text key={event.id}>
          <Text color="gray">#{event.id}</Text> {event.type}:{" "}
          {previewText({ value: event.message, maxCharacters: 120 })}
        </Text>
      ))}
    </Section>
  );
}

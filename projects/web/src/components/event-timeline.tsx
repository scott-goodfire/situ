import type { EventRecord } from "@almanac/protocol";

export function EventTimeline({ events }: { events: EventRecord[] }) {
  return (
    <section className="band">
      <h2>Timeline</h2>
      <div className="timeline">
        {events.length === 0 && <p className="muted">No events yet</p>}
        {events.slice(-14).map((event) => (
          <div className="event" key={event.id}>
            <span>#{event.id}</span>
            <span>{event.type}</span>
            <span>{event.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

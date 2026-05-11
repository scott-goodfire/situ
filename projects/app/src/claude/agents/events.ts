import { claudeAgentEvents } from "../../data/db/schema";
import { runSyncedWrite } from "../../data/db/sync";
import { jsonModule } from "../../modules/json";
import { dateTimeModule } from "../../modules/date-time";

export async function recordManagedEvent({
  agentId,
  event,
}: {
  agentId?: string;
  event: unknown;
}): Promise<void> {
  const payload = jsonModule.record({ value: event });
  const now = dateTimeModule.nowIso();
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      db.insert(claudeAgentEvents)
        .values({
          id: crypto.randomUUID(),
          agentId,
          claudeEventId: stringValue({ value: payload.id }),
          type: stringValue({ value: payload.type }) ?? "unknown",
          payloadJson: JSON.stringify(payload),
          syncVersion,
          syncDeleted: false,
          createdAt: now,
        })
        .run();
    },
  });
}

export function textFromAgentMessage({ event }: { event: unknown }): string {
  const payload = jsonModule.record({ value: event });
  if (!Array.isArray(payload.content)) {
    return "";
  }
  return payload.content
    .map((block) => {
      const text = jsonModule.record({ value: block }).text;
      return typeof text === "string" ? text : "";
    })
    .join("");
}

export function eventType({ event }: { event: unknown }): string {
  const type = jsonModule.record({ value: event }).type;
  return typeof type === "string" ? type : "unknown";
}

function stringValue({ value }: { value: unknown }): string | null {
  return typeof value === "string" ? value : null;
}

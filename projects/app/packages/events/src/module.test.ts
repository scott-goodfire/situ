import { expect, test } from "bun:test";

import { EVENTS_TABLE, eventsModule } from ".";

test("exports event module metadata", () => {
  expect(eventsModule.name).toBe("@situ/events");
  expect(EVENTS_TABLE).toBe("events");
});

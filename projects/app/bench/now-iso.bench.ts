import { bench, group, run } from "mitata";

import { dateTimeModule } from "../src/modules/date-time";

group("nowIso", () => {
  bench("nowIso()", () => {
    dateTimeModule.nowIso();
  });

  bench("new Date().toISOString()", () => {
    new Date().toISOString();
  });
});

await run();

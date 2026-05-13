import { expect, test } from "bun:test";

import { measurementsModule } from ".";

test("exports measurement module metadata", () => {
  expect(measurementsModule.name).toBe("@situ/measurements");
});

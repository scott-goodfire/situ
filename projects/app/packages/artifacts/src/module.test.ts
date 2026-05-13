import { expect, test } from "bun:test";

import { ARTIFACT_TYPES, artifactsModule } from ".";

test("exports artifact module metadata", () => {
  expect(artifactsModule.name).toBe("@situ/artifacts");
  expect(ARTIFACT_TYPES).toContain("report");
});

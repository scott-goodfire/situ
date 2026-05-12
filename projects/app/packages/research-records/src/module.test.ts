import { describe, expect, test } from "bun:test";

import { researchRecordsModule } from "./module";

describe("researchRecordsModule namespace", () => {
  test("exposes all seven repositories under stable keys", () => {
    expect(typeof researchRecordsModule.hypotheses.create).toBe("function");
    expect(typeof researchRecordsModule.experiments.create).toBe("function");
    expect(typeof researchRecordsModule.baselines.create).toBe("function");
    expect(typeof researchRecordsModule.evaluations.create).toBe("function");
    expect(typeof researchRecordsModule.measurements.record).toBe("function");
    expect(typeof researchRecordsModule.artifacts.create).toBe("function");
    expect(typeof researchRecordsModule.entityLinks.create).toBe("function");
  });

  test("exposes configure + resetForTests", () => {
    expect(typeof researchRecordsModule.configure).toBe("function");
    expect(typeof researchRecordsModule.resetForTests).toBe("function");
  });
});

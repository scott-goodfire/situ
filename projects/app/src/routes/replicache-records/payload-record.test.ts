import { describe, expect, test } from "bun:test";

import { payloadRecord } from "./payload-record";

describe("payloadRecord", () => {
  test("parses object payload JSON for Replicache records", () => {
    expect(
      payloadRecord({
        payloadJson: '{"changedFiles":["train.py"],"score":0.7}',
        label: "experiment:test",
      }),
    ).toEqual({
      changedFiles: ["train.py"],
      score: 0.7,
    });
  });

  test("normalizes non-object JSON to an empty payload", () => {
    expect(payloadRecord({ payloadJson: "[]", label: "activity:test" })).toEqual({});
  });

  test("throws a labeled error for malformed JSON", () => {
    expect(() => payloadRecord({ payloadJson: "not json", label: "measurement:test" })).toThrow(
      "Failed to parse Replicache payload JSON for measurement:test.",
    );
  });
});

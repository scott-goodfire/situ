import { describe, test } from "bun:test";

import { MANAGER_SYSTEM } from "./manager/system";
import { REPORTER_SYSTEM } from "./reporter/system";
import { SCIENTIST_SYSTEM } from "./scientist/system";
import { SCRIBE_SYSTEM } from "./scribe/system";
import { VERIFIER_SYSTEM } from "./verifier/system";

function normalizeMarkerText(value: string): string {
  return value.replaceAll(/\s+/g, " ").trim();
}

function expectRequiredMarkers(output: string, markers: readonly string[]): void {
  const normalized = normalizeMarkerText(output);
  const missing = markers.filter((marker) => !normalized.includes(normalizeMarkerText(marker)));
  if (missing.length > 0) {
    throw new Error(
      `Missing required markers:\n${missing.map((m) => `  - ${JSON.stringify(m)}`).join("\n")}`,
    );
  }
}

function expectForbiddenMarkers(output: string, markers: readonly string[]): void {
  const normalized = normalizeMarkerText(output);
  const found = markers.filter((marker) => normalized.includes(normalizeMarkerText(marker)));
  if (found.length > 0) {
    throw new Error(
      `Forbidden markers were present:\n${found.map((m) => `  - ${JSON.stringify(m)}`).join("\n")}`,
    );
  }
}

const ideationFramingMarkers = ["web_search", "ideation", "exploration", "never as evidence"];

describe("role system prompts", () => {
  describe.each([
    ["manager", MANAGER_SYSTEM],
    ["scientist", SCIENTIST_SYSTEM],
    ["reporter", REPORTER_SYSTEM],
  ])("%s frames web_search as ideation only", (_role, system) => {
    test("emits web_search/ideation framing", () => {
      expectRequiredMarkers(system, ideationFramingMarkers);
    });
  });

  test("scribe narrows web_search to narration support", () => {
    expectRequiredMarkers(SCRIBE_SYSTEM, ["web_search", "rarely useful", "Never use it to invent"]);
  });

  test("verifier does not expose web_search", () => {
    expectForbiddenMarkers(VERIFIER_SYSTEM, ["web_search"]);
  });
});

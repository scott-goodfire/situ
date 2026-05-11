import { markerTextModule } from "../modules/marker-text";

export type MarkerExpectation = Readonly<{
  required: string[];
  forbidden?: string[];
}>;

export const markerScorer = {
  name: "markers",
  description: "Required markers are present and forbidden markers are absent.",
  scorer: ({ output, expected }: { output: string; expected: MarkerExpectation }) => {
    const normalizedOutput = normalizeMarkerText({ value: output });
    const missing = expected.required.filter(
      (marker) => !normalizedOutput.includes(normalizeMarkerText({ value: marker })),
    );
    const forbiddenHits = (expected.forbidden ?? []).filter((marker) =>
      normalizedOutput.includes(normalizeMarkerText({ value: marker })),
    );
    return {
      score: missing.length === 0 && forbiddenHits.length === 0 ? 1 : 0,
      metadata: { missing, forbiddenHits },
    };
  },
};

export function normalizeMarkerText({ value }: { value: string }): string {
  return markerTextModule.normalizeMarkerText({ value });
}

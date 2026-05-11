import {
  changedFilesFromState,
  durableStateText,
  type TinyAutoresearchDurableState,
} from "./durable-state";

export type DurableStateExpectation = Readonly<{
  minCounts?: Partial<Record<keyof TinyAutoresearchDurableState, number>>;
  requiredMarkers?: string[];
  requiredChangedFiles?: string[];
  forbiddenChangedFiles?: string[];
}>;

export type DurableStateCheckResult = Readonly<{
  passed: boolean;
  missingCounts: string[];
  missingMarkers: string[];
  missingChangedFiles: string[];
  forbiddenChangedFiles: string[];
  changedFiles: string[];
}>;

export function checkDurableState({
  state,
  expectation,
}: {
  state: TinyAutoresearchDurableState;
  expectation: DurableStateExpectation;
}): DurableStateCheckResult {
  const missingCounts = missingCountRequirements({ state, minCounts: expectation.minCounts ?? {} });
  const text = durableStateText({ state });
  const missingMarkers = (expectation.requiredMarkers ?? []).filter(
    (marker) => !text.includes(marker.toLowerCase()),
  );
  const changedFiles = changedFilesFromState({ state });
  const missingChangedFiles = (expectation.requiredChangedFiles ?? []).filter(
    (file) => !changedFiles.includes(file),
  );
  const forbiddenChangedFiles = (expectation.forbiddenChangedFiles ?? []).filter((file) =>
    changedFiles.includes(file),
  );

  return {
    passed:
      missingCounts.length === 0 &&
      missingMarkers.length === 0 &&
      missingChangedFiles.length === 0 &&
      forbiddenChangedFiles.length === 0,
    missingCounts,
    missingMarkers,
    missingChangedFiles,
    forbiddenChangedFiles,
    changedFiles,
  };
}

function missingCountRequirements({
  state,
  minCounts,
}: {
  state: TinyAutoresearchDurableState;
  minCounts: Partial<Record<keyof TinyAutoresearchDurableState, number>>;
}): string[] {
  const missing: string[] = [];
  for (const [key, minimum] of Object.entries(minCounts)) {
    const value = state[key as keyof TinyAutoresearchDurableState];
    const count = Array.isArray(value) ? value.length : value ? 1 : 0;
    if (count < minimum) {
      missing.push(`${key}: expected at least ${minimum}, got ${count}`);
    }
  }
  return missing;
}

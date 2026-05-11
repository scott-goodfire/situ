export type DurableStateLike = Readonly<Record<string, unknown>>;

export type DurableStateExpectation = Readonly<{
  minCounts?: Partial<Record<string, number>>;
  maxCounts?: Partial<Record<string, number>>;
  requiredMarkers?: string[];
  requiredResearchTaskMarkers?: string[];
  forbiddenResearchTaskMarkers?: string[];
  requiredExperimentMarkers?: string[];
  requiredVerificationMarkers?: string[];
  requiredArtifactMarkers?: string[];
  requiredChangedFiles?: string[];
  forbiddenChangedFiles?: string[];
  requiredParentExperimentIds?: string[];
  requiredAssociatedHypothesisIds?: string[];
  requiredResearchTaskTypes?: string[];
  requiredVerificationStatuses?: string[];
  requiredToolUses?: string[];
  forbiddenToolUses?: string[];
}>;

type DurableStateEvalOutput = Readonly<{
  state: DurableStateLike;
}>;

export type DurableStateEvalExpected = DurableStateExpectation;

type DurableStateEvidence = Readonly<{
  changedFiles: string[];
  toolUses: string[];
  parentExperimentIds: string[];
  associatedHypothesisIds: string[];
  researchTaskTypes: string[];
  verificationStatuses: string[];
}>;

type DurableStateRequirementResult = Readonly<{
  missingCounts: string[];
  excessCounts: string[];
  missingMarkers: string[];
  missingResearchTaskMarkers: string[];
  forbiddenResearchTaskMarkers: string[];
  missingExperimentMarkers: string[];
  missingVerificationMarkers: string[];
  missingArtifactMarkers: string[];
  missingChangedFiles: string[];
  forbiddenChangedFiles: string[];
  changedFiles: string[];
  missingParentExperimentIds: string[];
  parentExperimentIds: string[];
  missingAssociatedHypothesisIds: string[];
  associatedHypothesisIds: string[];
  missingResearchTaskTypes: string[];
  researchTaskTypes: string[];
  missingVerificationStatuses: string[];
  verificationStatuses: string[];
  missingToolUses: string[];
  forbiddenToolUses: string[];
  toolUses: string[];
}>;

type DurableStateCheckResult = DurableStateRequirementResult &
  Readonly<{
    passed: boolean;
  }>;

export const durableStateScorer = {
  name: "durable-state",
  description: "Durable fixture state satisfies count, marker, and changed-file expectations.",
  scorer: ({
    output,
    expected,
  }: {
    output: DurableStateEvalOutput;
    expected: DurableStateEvalExpected;
  }) => {
    const result = checkDurableState({ state: output.state, expectation: expected });
    return {
      score: result.passed ? 1 : 0,
      metadata: result,
    };
  },
};

function checkDurableState({
  state,
  expectation,
}: {
  state: DurableStateLike;
  expectation: DurableStateExpectation;
}): DurableStateCheckResult {
  const evidence = durableStateEvidenceFrom({ state });
  const result = durableStateRequirementResult({ state, expectation, evidence });

  return {
    passed: passesDurableStateRequirements({ result }),
    ...result,
  };
}

function durableStateEvidenceFrom({ state }: { state: DurableStateLike }): DurableStateEvidence {
  return {
    changedFiles: changedFilesFromState({ state }),
    toolUses: toolUsesFromState({ state }),
    parentExperimentIds: parentExperimentIdsFromState({ state }),
    associatedHypothesisIds: associatedHypothesisIdsFromState({ state }),
    researchTaskTypes: researchTaskTypesFromState({ state }),
    verificationStatuses: verificationStatusesFromState({ state }),
  };
}

function durableStateRequirementResult({
  state,
  expectation,
  evidence,
}: {
  state: DurableStateLike;
  expectation: DurableStateExpectation;
  evidence: DurableStateEvidence;
}): DurableStateRequirementResult {
  return {
    ...durableStateCountResult({ state, expectation }),
    ...durableStateMarkerResult({ state, expectation }),
    ...durableStateChangedFileResult({ expectation, evidence }),
    ...durableStateLineageResult({ expectation, evidence }),
    ...durableStateToolUseResult({ expectation, evidence }),
  };
}

function durableStateCountResult({
  state,
  expectation,
}: {
  state: DurableStateLike;
  expectation: DurableStateExpectation;
}): Pick<DurableStateRequirementResult, "missingCounts" | "excessCounts"> {
  return {
    missingCounts: missingCountRequirements({
      state,
      minCounts: expectation.minCounts ?? {},
    }),
    excessCounts: excessCountRequirements({
      state,
      maxCounts: expectation.maxCounts ?? {},
    }),
  };
}

function durableStateMarkerResult({
  state,
  expectation,
}: {
  state: DurableStateLike;
  expectation: DurableStateExpectation;
}): Pick<
  DurableStateRequirementResult,
  | "missingMarkers"
  | "missingResearchTaskMarkers"
  | "forbiddenResearchTaskMarkers"
  | "missingExperimentMarkers"
  | "missingVerificationMarkers"
  | "missingArtifactMarkers"
> {
  return {
    missingMarkers: missingMarkersFromState({
      state,
      requiredMarkers: expectation.requiredMarkers ?? [],
    }),
    missingResearchTaskMarkers: missingMarkersFromCollection({
      state,
      collectionName: "researchTasks",
      requiredMarkers: expectation.requiredResearchTaskMarkers ?? [],
    }),
    forbiddenResearchTaskMarkers: presentForbiddenMarkersFromCollection({
      state,
      collectionName: "researchTasks",
      forbiddenMarkers: expectation.forbiddenResearchTaskMarkers ?? [],
    }),
    missingExperimentMarkers: missingMarkersFromCollection({
      state,
      collectionName: "experiments",
      requiredMarkers: expectation.requiredExperimentMarkers ?? [],
    }),
    missingVerificationMarkers: missingMarkersFromCollection({
      state,
      collectionName: "researchTaskVerifications",
      requiredMarkers: expectation.requiredVerificationMarkers ?? [],
    }),
    missingArtifactMarkers: missingMarkersFromCollection({
      state,
      collectionName: "artifacts",
      requiredMarkers: expectation.requiredArtifactMarkers ?? [],
    }),
  };
}

function durableStateChangedFileResult({
  expectation,
  evidence,
}: {
  expectation: DurableStateExpectation;
  evidence: DurableStateEvidence;
}): Pick<
  DurableStateRequirementResult,
  "missingChangedFiles" | "forbiddenChangedFiles" | "changedFiles"
> {
  return {
    missingChangedFiles: missingValues({
      requiredValues: expectation.requiredChangedFiles ?? [],
      availableValues: evidence.changedFiles,
    }),
    forbiddenChangedFiles: presentForbiddenValues({
      forbiddenValues: expectation.forbiddenChangedFiles ?? [],
      availableValues: evidence.changedFiles,
    }),
    changedFiles: evidence.changedFiles,
  };
}

function durableStateLineageResult({
  expectation,
  evidence,
}: {
  expectation: DurableStateExpectation;
  evidence: DurableStateEvidence;
}): Pick<
  DurableStateRequirementResult,
  | "missingParentExperimentIds"
  | "parentExperimentIds"
  | "missingAssociatedHypothesisIds"
  | "associatedHypothesisIds"
  | "missingResearchTaskTypes"
  | "researchTaskTypes"
  | "missingVerificationStatuses"
  | "verificationStatuses"
> {
  return {
    missingParentExperimentIds: missingValues({
      requiredValues: expectation.requiredParentExperimentIds ?? [],
      availableValues: evidence.parentExperimentIds,
    }),
    parentExperimentIds: evidence.parentExperimentIds,
    missingAssociatedHypothesisIds: missingValues({
      requiredValues: expectation.requiredAssociatedHypothesisIds ?? [],
      availableValues: evidence.associatedHypothesisIds,
    }),
    associatedHypothesisIds: evidence.associatedHypothesisIds,
    missingResearchTaskTypes: missingValues({
      requiredValues: expectation.requiredResearchTaskTypes ?? [],
      availableValues: evidence.researchTaskTypes,
    }),
    researchTaskTypes: evidence.researchTaskTypes,
    missingVerificationStatuses: missingValues({
      requiredValues: expectation.requiredVerificationStatuses ?? [],
      availableValues: evidence.verificationStatuses,
    }),
    verificationStatuses: evidence.verificationStatuses,
  };
}

function durableStateToolUseResult({
  expectation,
  evidence,
}: {
  expectation: DurableStateExpectation;
  evidence: DurableStateEvidence;
}): Pick<DurableStateRequirementResult, "missingToolUses" | "forbiddenToolUses" | "toolUses"> {
  return {
    missingToolUses: missingValues({
      requiredValues: expectation.requiredToolUses ?? [],
      availableValues: evidence.toolUses,
    }),
    forbiddenToolUses: presentForbiddenValues({
      forbiddenValues: expectation.forbiddenToolUses ?? [],
      availableValues: evidence.toolUses,
    }),
    toolUses: evidence.toolUses,
  };
}

function missingMarkersFromState({
  state,
  requiredMarkers,
}: {
  state: DurableStateLike;
  requiredMarkers: string[];
}): string[] {
  const text = JSON.stringify(state).toLowerCase();
  return requiredMarkers.filter((marker) => !text.includes(marker.toLowerCase()));
}

function missingMarkersFromCollection({
  state,
  collectionName,
  requiredMarkers,
}: {
  state: DurableStateLike;
  collectionName: string;
  requiredMarkers: string[];
}): string[] {
  const rows = state[collectionName];
  const text = JSON.stringify(Array.isArray(rows) ? rows : []).toLowerCase();
  return requiredMarkers.filter((marker) => !text.includes(marker.toLowerCase()));
}

function presentForbiddenMarkersFromCollection({
  state,
  collectionName,
  forbiddenMarkers,
}: {
  state: DurableStateLike;
  collectionName: string;
  forbiddenMarkers: string[];
}): string[] {
  const rows = state[collectionName];
  const text = JSON.stringify(Array.isArray(rows) ? rows : []).toLowerCase();
  return forbiddenMarkers.filter((marker) => text.includes(marker.toLowerCase()));
}

function missingValues({
  requiredValues,
  availableValues,
}: {
  requiredValues: string[];
  availableValues: string[];
}): string[] {
  return requiredValues.filter((value) => !availableValues.includes(value));
}

function presentForbiddenValues({
  forbiddenValues,
  availableValues,
}: {
  forbiddenValues: string[];
  availableValues: string[];
}): string[] {
  return forbiddenValues.filter((value) => availableValues.includes(value));
}

function passesDurableStateRequirements({
  result,
}: {
  result: DurableStateRequirementResult;
}): boolean {
  return [
    result.missingCounts,
    result.excessCounts,
    result.missingMarkers,
    result.missingResearchTaskMarkers,
    result.forbiddenResearchTaskMarkers,
    result.missingExperimentMarkers,
    result.missingVerificationMarkers,
    result.missingArtifactMarkers,
    result.missingChangedFiles,
    result.forbiddenChangedFiles,
    result.missingParentExperimentIds,
    result.missingAssociatedHypothesisIds,
    result.missingResearchTaskTypes,
    result.missingVerificationStatuses,
    result.missingToolUses,
    result.forbiddenToolUses,
  ].every((missing) => missing.length === 0);
}

function missingCountRequirements({
  state,
  minCounts,
}: {
  state: DurableStateLike;
  minCounts: Partial<Record<string, number>>;
}): string[] {
  const missing: string[] = [];
  for (const [key, minimum] of Object.entries(minCounts)) {
    if (minimum === undefined) {
      continue;
    }
    const value = state[key];
    const count = Array.isArray(value) ? value.length : value ? 1 : 0;
    if (count < minimum) {
      missing.push(`${key}: expected at least ${minimum}, got ${count}`);
    }
  }
  return missing;
}

function excessCountRequirements({
  state,
  maxCounts,
}: {
  state: DurableStateLike;
  maxCounts: Partial<Record<string, number>>;
}): string[] {
  const excess: string[] = [];
  for (const [key, maximum] of Object.entries(maxCounts)) {
    if (maximum === undefined) {
      continue;
    }
    const value = state[key];
    const count = Array.isArray(value) ? value.length : value ? 1 : 0;
    if (count > maximum) {
      excess.push(`${key}: expected at most ${maximum}, got ${count}`);
    }
  }
  return excess;
}

function changedFilesFromState({ state }: { state: DurableStateLike }): string[] {
  const changed = new Set<string>();
  for (const collectionName of ["researchTasks", "activities", "measurements"]) {
    const rows = state[collectionName];
    if (!Array.isArray(rows)) {
      continue;
    }
    for (const row of rows) {
      const record = objectRecord({ value: row });
      const payload = objectRecord({ value: record?.payload });
      const changedFiles = payload?.changedFiles;
      if (!Array.isArray(changedFiles)) {
        continue;
      }
      for (const changedFile of changedFiles) {
        if (typeof changedFile === "string") {
          changed.add(changedFile);
        }
      }
    }
  }
  return [...changed].sort();
}

function uniqueExperimentFieldFromState({
  state,
  snakeKey,
  camelKey,
}: {
  state: DurableStateLike;
  snakeKey: string;
  camelKey: string;
}): string[] {
  const values = new Set<string>();
  const rows = state.experiments;
  if (!Array.isArray(rows)) {
    return [];
  }
  for (const row of rows) {
    const record = objectRecord({ value: row });
    const value = nonBlankString({
      value: record?.[snakeKey] ?? record?.[camelKey],
    });
    if (value) {
      values.add(value);
    }
  }
  return [...values].sort();
}

function parentExperimentIdsFromState({ state }: { state: DurableStateLike }): string[] {
  return uniqueExperimentFieldFromState({
    state,
    snakeKey: "parent_experiment_id",
    camelKey: "parentExperimentId",
  });
}

function associatedHypothesisIdsFromState({ state }: { state: DurableStateLike }): string[] {
  return uniqueExperimentFieldFromState({
    state,
    snakeKey: "associated_hypothesis_id",
    camelKey: "associatedHypothesisId",
  });
}

function researchTaskTypesFromState({ state }: { state: DurableStateLike }): string[] {
  const types = new Set<string>();
  const rows = state.researchTasks;
  if (!Array.isArray(rows)) {
    return [];
  }
  for (const row of rows) {
    const type = nonBlankString({ value: objectRecord({ value: row })?.type });
    if (type) {
      types.add(type);
    }
  }
  return [...types].sort();
}

function verificationStatusesFromState({ state }: { state: DurableStateLike }): string[] {
  const statuses = new Set<string>();
  const rows = state.researchTaskVerifications;
  if (!Array.isArray(rows)) {
    return [];
  }
  for (const row of rows) {
    const status = nonBlankString({ value: objectRecord({ value: row })?.status });
    if (status) {
      statuses.add(status);
    }
  }
  return [...statuses].sort();
}

function toolUsesFromState({ state }: { state: DurableStateLike }): string[] {
  const names = new Set<string>();
  const rows = state.claudeAgentEvents;
  if (!Array.isArray(rows)) {
    return [];
  }
  for (const row of rows) {
    const name = toolUseNameFromRow({ row });
    if (name !== undefined) {
      names.add(name);
    }
  }
  return [...names].sort();
}

function toolUseNameFromRow({ row }: { row: unknown }): string | undefined {
  const record = objectRecord({ value: row });
  const payload = objectRecord({ value: record?.payload });
  if (!isCustomToolUseEvent({ record, payload })) {
    return undefined;
  }
  return nonBlankString({ value: payload?.name });
}

function isCustomToolUseEvent({
  record,
  payload,
}: {
  record: Record<string, unknown> | undefined;
  payload: Record<string, unknown> | undefined;
}): boolean {
  return record?.type === "agent.custom_tool_use" || payload?.type === "agent.custom_tool_use";
}

function nonBlankString({ value }: { value: unknown }): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? value : undefined;
}

function objectRecord({ value }: { value: unknown }): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

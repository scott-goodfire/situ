export const EXPERIMENT_MUTATIONS = [
  "experiment/create",
  "experiment/update_status",
  "experiment/capture_candidate_commit",
] as const;

export type ExperimentMutationName = (typeof EXPERIMENT_MUTATIONS)[number];

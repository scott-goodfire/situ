export const ARTIFACT_MUTATIONS = ["artifact/create"] as const;

export type ArtifactMutationName = (typeof ARTIFACT_MUTATIONS)[number];

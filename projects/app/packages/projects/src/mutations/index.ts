export const PROJECT_MUTATIONS = ["project/create", "project/update_status"] as const;

export type ProjectMutationName = (typeof PROJECT_MUTATIONS)[number];

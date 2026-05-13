export const REVIEW_MUTATIONS = ["review/create"] as const;

export type ReviewMutationName = (typeof REVIEW_MUTATIONS)[number];

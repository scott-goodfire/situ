export const COMMENT_MUTATIONS = ["comment/create"] as const;

export type CommentMutationName = (typeof COMMENT_MUTATIONS)[number];

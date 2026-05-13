export const EVENT_MUTATIONS = ["event/create"] as const;

export type EventMutationName = (typeof EVENT_MUTATIONS)[number];

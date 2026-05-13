export const MEASUREMENT_MUTATIONS = ["measurement/create"] as const;

export type MeasurementMutationName = (typeof MEASUREMENT_MUTATIONS)[number];

export type IsoTimestamp = string;

export const nowIso = (): IsoTimestamp => new Date().toISOString();

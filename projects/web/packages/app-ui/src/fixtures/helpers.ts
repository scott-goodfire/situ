export const minutesAgo = (n: number): string => new Date(Date.now() - n * 60_000).toISOString();
export const hoursAgo = (n: number): string => new Date(Date.now() - n * 3600_000).toISOString();
export const daysAgo = (n: number): string => new Date(Date.now() - n * 86_400_000).toISOString();

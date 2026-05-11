export type SchedulerJob = {
  readonly name: string;
  readonly intervalMs: number;
  readonly concurrency?: number;
  readonly runImmediately?: boolean;
  readonly run: () => Promise<void>;
};

export type RuntimeScheduler = {
  start: () => void;
  stop: () => Promise<void>;
};

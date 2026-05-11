import { logModule } from "../../modules/log";
import { obs, withSpan } from "../../observability";
import type { RuntimeScheduler, SchedulerJob } from "./types";

export function createScheduler({ jobs }: { jobs: readonly SchedulerJob[] }): RuntimeScheduler {
  let started = false;
  const intervals: ReturnType<typeof setInterval>[] = [];
  const activeRuns = new Set<Promise<void>>();
  const runningJobCounts = new Map<string, number>();

  const runJob = ({ job }: { job: SchedulerJob }) => {
    const concurrency = Math.max(1, job.concurrency ?? 1);
    const runningCount = runningJobCounts.get(job.name) ?? 0;
    if (runningCount >= concurrency) {
      return;
    }

    runningJobCounts.set(job.name, runningCount + 1);
    const run = withSpan({
      name: obs.span.scheduler.job,
      attributes: { [obs.attr.scheduler.job]: job.name },
      fn: () => job.run(),
    })
      .catch((error) => {
        logModule.error(obs.log.scheduler.jobFailed, {
          [obs.attr.scheduler.job]: job.name,
          error,
        });
      })
      .finally(() => {
        const nextCount = (runningJobCounts.get(job.name) ?? 1) - 1;
        if (nextCount > 0) {
          runningJobCounts.set(job.name, nextCount);
        } else {
          runningJobCounts.delete(job.name);
        }
        activeRuns.delete(run);
      });
    activeRuns.add(run);
  };

  return {
    start() {
      if (started) {
        return;
      }
      started = true;
      for (const job of jobs) {
        if (job.runImmediately !== false) {
          runJob({ job });
        }
        intervals.push(
          setInterval(() => {
            runJob({ job });
          }, job.intervalMs),
        );
      }
    },
    async stop() {
      for (const interval of intervals) {
        clearInterval(interval);
      }
      intervals.length = 0;
      await Promise.race([
        Promise.allSettled(activeRuns),
        new Promise((resolve) => {
          setTimeout(resolve, 5_000);
        }),
      ]);
      activeRuns.clear();
      runningJobCounts.clear();
      started = false;
    },
  };
}

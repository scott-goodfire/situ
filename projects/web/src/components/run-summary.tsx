import type { RunRecord } from "@almanac/protocol";

export function RunSummary({
  run,
  experimentCount,
}: {
  run: RunRecord | undefined;
  experimentCount: number;
}) {
  return (
    <section className="band">
      <h2>Run</h2>
      <p>{runLabel({ run, experimentCount })}</p>
    </section>
  );
}

function runLabel({
  run,
  experimentCount,
}: {
  run: RunRecord | undefined;
  experimentCount: number;
}): string {
  if (!run) {
    return "No run yet";
  }

  return `${run.id} | ${run.status} | experiments ${experimentCount}`;
}

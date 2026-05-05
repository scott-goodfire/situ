import type { RunRecord } from "@almanac/protocol";
import { DxSection } from "@almanac/web-ui";

export function RunSummary({
  run,
  experimentCount,
}: {
  run: RunRecord | undefined;
  experimentCount: number;
}) {
  return (
    <DxSection title="Run">
      <p>{runLabel({ run, experimentCount })}</p>
    </DxSection>
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

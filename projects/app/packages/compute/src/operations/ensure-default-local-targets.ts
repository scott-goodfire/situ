import { DEFAULT_COMPUTE_LABEL, DEFAULT_LOCAL_COMPUTE_POOL } from "../constants";
import { computeTargetRepository } from "../repository";

export async function ensureDefaultLocalTargets({
  desiredCount,
}: {
  desiredCount: number;
}): Promise<void> {
  if (desiredCount <= 0) {
    return;
  }
  const existing = await computeTargetRepository.listForPool({
    pool: DEFAULT_LOCAL_COMPUTE_POOL,
  });
  const live = existing.filter((target) => target.status !== "dead");
  if (live.length >= desiredCount) {
    return;
  }
  const usedLabels = new Set(
    live
      .map((target) => target.label)
      .filter((label): label is string => typeof label === "string" && label.length > 0),
  );
  let slot = 1;
  for (let created = 0; live.length + created < desiredCount; created += 1) {
    while (usedLabels.has(localSlotLabel({ slot }))) {
      slot += 1;
    }
    const label = localSlotLabel({ slot });
    await computeTargetRepository.upsert({
      pool: DEFAULT_LOCAL_COMPUTE_POOL,
      kind: "local",
      label,
    });
    usedLabels.add(label);
    slot += 1;
  }
}

function localSlotLabel({ slot }: { slot: number }): string {
  return `${DEFAULT_COMPUTE_LABEL} ${slot}`;
}

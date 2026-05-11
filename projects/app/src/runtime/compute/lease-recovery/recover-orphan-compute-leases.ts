import { inArray } from "drizzle-orm";

import { getDb } from "../../../data/db/client";
import { workItems } from "../../../data/db/schema";
import { computeTargetRepository } from "../../../data/repositories/compute-targets";
import { dateTimeModule } from "../../../modules/date-time";
import type { ComputeTargetRecord } from "../types";
import { recoverComputeTargetLease } from "./recover-compute-target-lease";

export async function recoverOrphanComputeLeases(): Promise<ComputeTargetRecord[]> {
  const released: ComputeTargetRecord[] = [];
  const openWorkItems = await getDb()
    .select()
    .from(workItems)
    .where(inArray(workItems.status, ["pending", "claimed"]));
  const now = dateTimeModule.nowIso();

  for (const target of await computeTargetRepository.listClaimed()) {
    const recovered = await recoverComputeTargetLease({
      target,
      openWorkItems,
      now,
    });
    if (recovered) {
      released.push(recovered);
    }
  }
  return released;
}

import { computeTargetRepository } from "../repository";

export async function liveTargetCount(): Promise<number> {
  const targets = await computeTargetRepository.listAll();
  return targets.filter((target) => target.status !== "dead").length;
}

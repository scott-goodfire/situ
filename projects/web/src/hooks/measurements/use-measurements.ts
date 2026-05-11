import type { MeasurementRecord } from "@situ/protocol";
import { useEntityList } from "../entity";

export function useMeasurements(): MeasurementRecord[] {
  return useEntityList<MeasurementRecord>("measurements/");
}

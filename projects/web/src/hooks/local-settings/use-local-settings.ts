import type { LocalSettingsRecord } from "@situ/protocol";
import { useEntity } from "../entity";

export function useLocalSettings(): LocalSettingsRecord | undefined {
  return useEntity<LocalSettingsRecord>("localSettings/", "default");
}

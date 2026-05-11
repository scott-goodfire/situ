import {
  localSettingsRepository,
  type LocalSettingsRecord,
} from "../data/repositories/local-settings";
import { hasAnthropicKey } from "./local-secret-store";

export async function syncLocalSettingsFromFilesystem(): Promise<LocalSettingsRecord> {
  return localSettingsRepository.upsert({
    anthropicKeyConfigured: await hasAnthropicKey(),
  });
}

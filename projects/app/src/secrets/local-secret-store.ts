import { mkdir, writeFile, chmod } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";

import { anthropicKeyFromEnv } from "../config/anthropic-key";
import { secretsPath } from "../config/paths";
import { jsonModule } from "../modules/json";
import { dateTimeModule } from "../modules/date-time";

const storedSecretsSchema = z.object({
  anthropicKey: z.string().optional(),
  updatedAt: z.string().optional(),
});

type StoredSecrets = z.infer<typeof storedSecretsSchema>;

export async function getAnthropicKey(): Promise<string | null> {
  const envKey = anthropicKeyFromEnv();
  if (envKey) {
    return envKey;
  }

  const secrets = await readSecrets();
  const key = secrets.anthropicKey?.trim();
  return key ? key : null;
}

export async function hasAnthropicKey(): Promise<boolean> {
  return (await getAnthropicKey()) !== null;
}

export async function setAnthropicKey({ anthropicKey }: { anthropicKey: string }): Promise<void> {
  const normalized = anthropicKey.trim();
  if (!normalized) {
    throw new Error("Anthropic API key is required.");
  }
  const next: StoredSecrets = {
    ...(await readSecrets()),
    anthropicKey: normalized,
    updatedAt: dateTimeModule.nowIso(),
  };
  const path = secretsPath();
  const parent = dirname(path);
  await mkdir(parent, { recursive: true });
  await chmod(parent, 0o700);
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(path, 0o600);
}

async function readSecrets(): Promise<StoredSecrets> {
  const record = await jsonModule.readRecordFile({ path: secretsPath() });
  const result = storedSecretsSchema.safeParse(record);
  return result.success ? result.data : {};
}

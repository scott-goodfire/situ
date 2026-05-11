import { Hono } from "hono";
import { z } from "zod";

import { localSettingsRepository } from "../data/repositories/local-settings";
import { verifyAnthropicKey } from "../secrets/anthropic-key-verification";
import { setAnthropicKey } from "../secrets/local-secret-store";
import { parseRouteBody } from "./__shared__/parse-route-body";

export const settingsRoutes = new Hono();

const anthropicKeyBodySchema = z.object({
  anthropicKey: z.string().trim().min(1, "anthropicKey is required"),
});

settingsRoutes.post("/settings/anthropic-key", async (c) => {
  const body = await parseRouteBody({ context: c, schema: anthropicKeyBodySchema });
  if (!body.ok) return body.response;

  try {
    await verifyAnthropicKey({ anthropicKey: body.value.anthropicKey });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : "Anthropic API key verification failed",
      },
      400,
    );
  }

  await setAnthropicKey({ anthropicKey: body.value.anthropicKey });
  const localSettings = await localSettingsRepository.upsert({
    anthropicKeyConfigured: true,
  });

  return c.json({
    anthropicKeyConfigured: localSettings.anthropicKeyConfigured,
    localSettings,
  });
});

import Anthropic from "@anthropic-ai/sdk";

import { getAnthropicKey } from "../../secrets/local-secret-store";

export async function getAnthropicClient(): Promise<Anthropic> {
  const apiKey = await getAnthropicKey();
  if (!apiKey) {
    throw new Error("Anthropic API key is not configured.");
  }

  return new Anthropic({ apiKey });
}

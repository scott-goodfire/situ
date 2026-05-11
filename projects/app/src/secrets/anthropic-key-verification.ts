import Anthropic from "@anthropic-ai/sdk";

export async function verifyAnthropicKey({
  anthropicKey,
}: {
  anthropicKey: string;
}): Promise<void> {
  const client = new Anthropic({ apiKey: anthropicKey });
  try {
    await client.models.list({ limit: 1 });
  } catch (error) {
    throw new Error(`Anthropic API key verification failed: ${errorMessage({ error })}`, {
      cause: error,
    });
  }
}

function errorMessage({ error }: { error: unknown }): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return "request failed";
}

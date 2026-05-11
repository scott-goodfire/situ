export type ClaudeAgentRole = "manager" | "scientist" | "verifier" | "scribe" | "reporter";
export type ClaudeAgentExecutionMode = "interactive" | "headless";

export type ClaudeAgentBlueprint = {
  readonly role: ClaudeAgentRole;
  readonly executionMode?: ClaudeAgentExecutionMode;
  readonly dbId: string;
  readonly displayName: string;
  readonly model: string;
  readonly system: string;
  readonly defaultToolsetEnabled: boolean;
  readonly webSearchEnabled: boolean;
  readonly skillNames: readonly string[];
};

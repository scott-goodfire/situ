export type ClaudeAgentRole = "manager" | "scientist" | "verifier";

export type ClaudeAgentBlueprint = {
  readonly role: ClaudeAgentRole;
  readonly dbId: string;
  readonly displayName: string;
  readonly model: string;
  readonly system: string;
  readonly defaultToolsetEnabled: boolean;
  readonly skillNames: readonly string[];
};

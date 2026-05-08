export type AgentTranscriptEntityKind = "hypothesis" | "experiment" | "evaluation";

export type AgentTranscriptTone = "neutral" | "warning" | "danger";

export type AgentTranscriptItem = {
  id: string;
  actor: string;
  title: string;
  body: string;
  createdAt: string;
  tone: AgentTranscriptTone;
  activityType: string;
  entity: {
    kind: AgentTranscriptEntityKind;
    id: string;
    title: string;
  };
};

export const ACTOR_KINDS = ["human", "agent", "system"] as const;

export type ActorKind = (typeof ACTOR_KINDS)[number];

export type ActorRef = {
  actorKind: ActorKind;
  actorId: string;
};

export const SYSTEM_ACTOR: ActorRef = {
  actorKind: "system",
  actorId: "system",
};

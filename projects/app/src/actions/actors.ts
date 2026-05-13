import { SYSTEM_ACTOR } from "@situ/common";
import type { ActorRef } from "@situ/common";
import { InvalidArgumentError } from "@situ/errors";

import type { AppRepositories } from "./repositories";

export type EnsureActorExistsInput = {
  actor: ActorRef;
  repositories: AppRepositories;
};

export type ResolveActionActorInput = {
  actor?: ActorRef;
  repositories: AppRepositories;
};

/**
 * Ensures an actor reference is valid at the app boundary.
 */
export const ensureActorExists = ({ actor, repositories }: EnsureActorExistsInput): void => {
  if (actor.actorId.trim() === "") {
    throw new InvalidArgumentError({
      details: {
        actor,
      },
      message: "Actor id must not be empty",
    });
  }

  if (actor.actorKind === "system") {
    if (actor.actorId === SYSTEM_ACTOR.actorId) {
      return;
    }

    throw new InvalidArgumentError({
      details: {
        actor,
        expected: SYSTEM_ACTOR,
      },
      message: "System actors must use the stable system actor id",
    });
  }

  if (actor.actorKind === "human") {
    return;
  }

  if (actor.actorKind === "agent") {
    repositories.agents.require({ id: actor.actorId });
    return;
  }

  throw new InvalidArgumentError({
    details: {
      actor,
    },
    message: `Unsupported actor kind: ${actor.actorKind}`,
  });
};

/**
 * Resolves and validates the actor for an app action.
 */
export const resolveActionActor = ({ actor, repositories }: ResolveActionActorInput): ActorRef => {
  const resolved = actor ?? SYSTEM_ACTOR;

  ensureActorExists({
    actor: resolved,
    repositories,
  });

  return resolved;
};

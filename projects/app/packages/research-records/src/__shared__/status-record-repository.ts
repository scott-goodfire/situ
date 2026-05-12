import { getResearchRecordsContext } from "../context";
import type { ResearchRecordStatus, ResearchRecordsDb } from "../types";
import { nowIso } from "./now-iso";
import { PreconditionError } from "./precondition-error";

type StatusTransitionInput<IdKey extends string> = {
  [Key in IdKey]: string;
} & {
  comment: string;
  actor?: string;
  actorAgentId?: string;
};

type StatusRecord = {
  status: ResearchRecordStatus;
};

type StatusTransitionConfig<Row extends StatusRecord> = {
  defaultActor: string;
  recordLabel: string;
  updateStatus: (input: {
    db: ResearchRecordsDb;
    id: string;
    status: ResearchRecordStatus;
    syncVersion: number;
    updatedAt: string;
  }) => void;
  insertActivity: (input: {
    db: ResearchRecordsDb;
    id: string;
    actor: string;
    actorAgentId?: string;
    kind: "status_updated";
    body: string;
    payload: Record<string, unknown>;
    syncVersion: number;
  }) => void;
  requireRecord: (input: { id: string }) => Promise<Row>;
};

export function createStatusRecordTransitions<IdKey extends string, Row extends StatusRecord>({
  idKey,
  defaultActor,
  recordLabel,
  updateStatus,
  insertActivity,
  requireRecord,
}: {
  idKey: IdKey;
} & StatusTransitionConfig<Row>): {
  accept: (input: StatusTransitionInput<IdKey>) => Promise<Row>;
  submit: (input: StatusTransitionInput<IdKey>) => Promise<Row>;
  complete: (input: StatusTransitionInput<IdKey>) => Promise<Row>;
  cancel: (input: StatusTransitionInput<IdKey>) => Promise<Row>;
  fail: (input: StatusTransitionInput<IdKey>) => Promise<Row>;
  transition: (
    input: StatusTransitionInput<IdKey> & { status: ResearchRecordStatus },
  ) => Promise<Row>;
} {
  const transition = async (
    input: StatusTransitionInput<IdKey> & { status: ResearchRecordStatus },
  ): Promise<Row> => {
    const id = input[idKey];
    if (!id) {
      throw new PreconditionError({
        code: "record_id_required",
        hint: `Provide ${recordLabel} id when calling this transition; do not omit it.`,
        details: { recordLabel, idKey },
      });
    }
    const current = await requireRecord({ id });
    assertCanTransition({
      recordLabel,
      from: current.status,
      to: input.status,
      id,
    });
    const { runSyncedWrite } = getResearchRecordsContext();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        updateStatus({
          db,
          id,
          status: input.status,
          syncVersion,
          updatedAt: nowIso(),
        });
        insertActivity({
          db,
          id,
          actor: input.actor ?? defaultActor,
          actorAgentId: input.actorAgentId,
          kind: "status_updated",
          body: input.comment,
          payload: { status: input.status },
          syncVersion,
        });
      },
    });
    return requireRecord({ id });
  };

  return {
    accept: (input) => transition({ ...input, status: "accepted" }),
    submit: (input) => transition({ ...input, status: "in_review" }),
    complete: (input) => transition({ ...input, status: "done" }),
    cancel: (input) => transition({ ...input, status: "canceled" }),
    fail: (input) => transition({ ...input, status: "failed" }),
    transition,
  };
}

function assertCanTransition({
  recordLabel,
  from,
  to,
  id,
}: {
  recordLabel: string;
  from: ResearchRecordStatus;
  to: ResearchRecordStatus;
  id: string;
}): void {
  if (from === to) {
    return;
  }
  if (from === "done" || from === "canceled" || from === "failed") {
    throw new PreconditionError({
      code: "status_transition_terminal",
      hint: `${recordLabel} is already in terminal status "${from}" and cannot be re-transitioned; create a new record instead.`,
      details: { recordLabel, id, currentStatus: from, requestedStatus: to },
    });
  }
}

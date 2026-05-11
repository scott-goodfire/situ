import { runSyncedWrite, type SyncWriteDb } from "../../db/sync";
import { dateTimeModule } from "../../../modules/date-time";
import type { ResearchRecordStatus } from "./repository-utils";

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
    db: SyncWriteDb;
    id: string;
    status: ResearchRecordStatus;
    syncVersion: number;
    updatedAt: string;
  }) => void;
  insertActivity: (input: {
    db: SyncWriteDb;
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
      throw new Error(`${recordLabel} id is required`);
    }
    const current = await requireRecord({ id });
    assertCanTransition({
      recordLabel,
      from: current.status,
      to: input.status,
    });
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        updateStatus({
          db,
          id,
          status: input.status,
          syncVersion,
          updatedAt: dateTimeModule.nowIso(),
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
}: {
  recordLabel: string;
  from: ResearchRecordStatus;
  to: ResearchRecordStatus;
}): void {
  if (from === to) {
    return;
  }
  if (from === "done" || from === "canceled" || from === "failed") {
    throw new Error(`${recordLabel} cannot transition from terminal status: ${from}`);
  }
}

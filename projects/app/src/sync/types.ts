import type { ErrorDetails } from "@situ/errors";

export type ReplicacheMutation = {
  args: unknown;
  id: number;
  name: string;
};

export type ReplicachePushRequest = {
  clientID?: string;
  clientId?: string;
  mutations?: ReplicacheMutation[];
};

export type ReplicacheMutationResult =
  | {
      id: number;
      ok: true;
      result: unknown;
    }
  | {
      error: ErrorDetails;
      id: number;
      ok: false;
    };

export type ReplicachePushResponse = {
  mutationResults: ReplicacheMutationResult[];
};

export type ReplicachePullRequest = {
  cookie?: unknown;
};

export type ReplicachePullPatchOperation =
  | {
      key: string;
      op: "put";
      value: unknown;
    }
  | {
      key: string;
      op: "del";
    };

export type ReplicachePullResponse = {
  cookie: string;
  lastMutationIDChanges: Record<string, number>;
  patch: ReplicachePullPatchOperation[];
};

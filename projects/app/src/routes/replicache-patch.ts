import type { PatchOperation, ReadonlyJSONValue } from "replicache";

export function put({ key, value }: { key: string; value: unknown }): PatchOperation {
  return { op: "put", key, value: value as ReadonlyJSONValue };
}

export function putSyncedRows<Row extends { syncDeleted: boolean }>({
  collection,
  rows,
  key,
  value,
}: {
  collection: string;
  rows: Row[];
  key: (row: Row) => string;
  value: (row: Row) => unknown;
}): PatchOperation[] {
  return rows.map((row) => {
    const resolvedKey = `${collection}/${key(row)}`;
    return row.syncDeleted
      ? { op: "del", key: resolvedKey }
      : put({ key: resolvedKey, value: value(row) });
  });
}

export type ConnectionState =
  | { kind: "checking" }
  | { kind: "connected" }
  | { kind: "missing" }
  | { kind: "failed"; message: string };

export function ConnectionBadge({ state }: { state: ConnectionState }) {
  const label = connectionLabel({ state });

  return <span className={`badge ${state.kind}`}>{label}</span>;
}

function connectionLabel({ state }: { state: ConnectionState }): string {
  if (state.kind === "connected") {
    return "Connected";
  }

  if (state.kind === "checking") {
    return "Connecting";
  }

  if (state.kind === "failed") {
    return "Error";
  }

  return "No session";
}

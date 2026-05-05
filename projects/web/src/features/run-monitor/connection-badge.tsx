import { DxBadge, type DxBadgeTone } from "@almanac/web-ui";

export type ConnectionState =
  | { kind: "checking" }
  | { kind: "connected" }
  | { kind: "disconnected"; message: string }
  | { kind: "missing" }
  | { kind: "failed"; message: string };

export function ConnectionBadge({ state }: { state: ConnectionState }) {
  const label = connectionLabel({ state });
  const tone = connectionTone({ state });

  return <DxBadge tone={tone}>{label}</DxBadge>;
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

  if (state.kind === "disconnected") {
    return "Disconnected";
  }

  return "No session";
}

function connectionTone({ state }: { state: ConnectionState }): DxBadgeTone {
  if (state.kind === "connected") {
    return "success";
  }

  if (state.kind === "failed") {
    return "danger";
  }

  if (state.kind === "disconnected") {
    return "warning";
  }

  return "neutral";
}

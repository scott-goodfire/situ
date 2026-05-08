import { DxEmptyState } from "@situ/web-ui";
import type { ReactNode } from "react";

export function NoActiveHarnessView({
  heading = "No active Situ harness",
  description,
}: {
  heading?: ReactNode;
  description: ReactNode;
}) {
  return <DxEmptyState heading={heading} description={description} />;
}

export function ConnectingView({
  description = "Looking for a live Situ session for this project.",
}: {
  description?: ReactNode;
}) {
  return <DxEmptyState heading="Connecting" description={description} />;
}

export function FailedConnectionView({
  description = "Discovery API is unavailable.",
}: {
  description?: ReactNode;
}) {
  return <DxEmptyState heading="Could not reach Situ" description={description} />;
}

export function UnknownProjectView({ projectId }: { projectId: string }) {
  return (
    <DxEmptyState
      heading="Project not found"
      description={`No local Situ project exists with id ${projectId}.`}
    />
  );
}

import {
  DxAppFrame,
  DxBadge,
  DxSidebar,
  DxSidebarItem,
  DxSidebarSection,
} from "@situ/web-ui";
import {
  Activity,
  Beaker,
  FileText,
  FlaskConical,
  ListChecks,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

export type SituNavId =
  | "overview"
  | "hypotheses"
  | "experiments"
  | "evaluations"
  | "agents"
  | "events";

export type SituConnection =
  | { kind: "connected" }
  | { kind: "disconnected"; message?: string }
  | { kind: "failed"; message?: string }
  | { kind: "checking" };

export function SituShell({
  workspace,
  activeNav,
  connection,
  topBarActions,
  children,
  onNavigate,
}: {
  workspace: string;
  activeNav?: SituNavId;
  connection?: SituConnection;
  topBarActions?: ReactNode;
  children: ReactNode;
  onNavigate?: ({ navId }: { navId: SituNavId }) => void;
}) {
  return (
    <DxAppFrame
      sidebar={
        <DxSidebar
          header={
            <div style={{ display: "grid", gap: 2 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--foreground)",
                }}
              >
                Situ
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--muted-foreground-tertiary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {workspace}
              </span>
            </div>
          }
          footer={
            <span
              style={{
                fontSize: 11,
                color: "var(--muted-foreground-tertiary)",
              }}
            >
              v0.0.1 · SOC 2
            </span>
          }
        >
          <DxSidebarSection title="Project">
            <NavItem
              id="overview"
              label="Overview"
              icon={<FileText size={14} />}
              activeNav={activeNav}
              onNavigate={onNavigate}
            />
            <NavItem
              id="hypotheses"
              label="Hypotheses"
              icon={<Beaker size={14} />}
              activeNav={activeNav}
              onNavigate={onNavigate}
            />
            <NavItem
              id="experiments"
              label="Experiments"
              icon={<FlaskConical size={14} />}
              activeNav={activeNav}
              onNavigate={onNavigate}
            />
            <NavItem
              id="evaluations"
              label="Evaluations"
              icon={<ListChecks size={14} />}
              activeNav={activeNav}
              onNavigate={onNavigate}
            />
            <NavItem
              id="agents"
              label="Agents"
              icon={<Users size={14} />}
              activeNav={activeNav}
              onNavigate={onNavigate}
            />
            <NavItem
              id="events"
              label="Events"
              icon={<Activity size={14} />}
              activeNav={activeNav}
              onNavigate={onNavigate}
            />
          </DxSidebarSection>
        </DxSidebar>
      }
      topBar={
        connection || topBarActions ? (
          <>
            <div />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {connection && <ConnectionBadge connection={connection} />}
              {topBarActions}
            </div>
          </>
        ) : undefined
      }
    >
      {children}
    </DxAppFrame>
  );
}

function NavItem({
  id,
  label,
  icon,
  activeNav,
  onNavigate,
}: {
  id: SituNavId;
  label: string;
  icon: ReactNode;
  activeNav?: SituNavId;
  onNavigate?: ({ navId }: { navId: SituNavId }) => void;
}) {
  return (
    <DxSidebarItem
      icon={icon}
      label={label}
      href="#"
      active={activeNav === id}
      onClick={(event) => {
        event.preventDefault();
        onNavigate?.({ navId: id });
      }}
    />
  );
}

function ConnectionBadge({ connection }: { connection: SituConnection }) {
  if (connection.kind === "connected") {
    return (
      <DxBadge tone="success" withDot>
        Connected
      </DxBadge>
    );
  }

  if (connection.kind === "checking") {
    return <DxBadge tone="neutral">Checking…</DxBadge>;
  }

  if (connection.kind === "disconnected") {
    return <DxBadge tone="warning">Disconnected</DxBadge>;
  }

  return <DxBadge tone="danger">Disconnected</DxBadge>;
}

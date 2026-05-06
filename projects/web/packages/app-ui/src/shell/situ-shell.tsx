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
import * as s from "../styles.css";

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
            <div className={s.sidebarHeader}>
              <span className={s.sidebarBrand}>Situ</span>
              <span className={s.sidebarWorkspace}>{workspace}</span>
            </div>
          }
          footer={<span className={s.sidebarFooter}>v0.0.1 · SOC 2</span>}
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
            <div className={s.topBarActions}>
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

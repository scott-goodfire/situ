import {
  DxAppFrame,
  DxSidebar,
  DxSidebarItem,
  DxSidebarSection,
} from "@situ/web-ui";
import { cloneElement, isValidElement } from "react";
import type {
  AnchorHTMLAttributes,
  AriaAttributes,
  HTMLAttributes,
  ReactElement,
  ReactNode,
} from "react";
import * as s from "./situ-shell.css";

type RenderableProps = HTMLAttributes<HTMLElement> &
  AriaAttributes &
  AnchorHTMLAttributes<HTMLAnchorElement> & { [key: string]: unknown };

export type SituNavId =
  | "overview"
  | "analyses"
  | "hypotheses"
  | "experiments"
  | "trajectory"
  | "evaluations"
  | "tasks"
  | "agents"
  | "events";

export type SituShellNavItem = {
  id: SituNavId;
  label: string;
  icon: ReactNode;
  active?: boolean;
  render?: ReactElement;
  href?: string;
  onClick?: () => void;
};

export function SituShell({
  workspace,
  workspaceLink,
  navItems = [],
  footer,
  topBarActions,
  children,
}: {
  workspace?: string;
  workspaceLink?: ReactElement;
  navItems?: SituShellNavItem[];
  footer?: ReactNode;
  topBarActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <DxAppFrame
      sidebar={
        <DxSidebar
          header={<SidebarHeader workspace={workspace} workspaceLink={workspaceLink} />}
          footer={footer ?? <span className={s.sidebarFooter}>v0.0.1</span>}
        >
          {navItems.length > 0 && (
            <DxSidebarSection title="Project">
              {navItems.map((item) => (
                <DxSidebarItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  href={item.href}
                  active={item.active}
                  render={item.render}
                  onClick={item.onClick}
                />
              ))}
            </DxSidebarSection>
          )}
        </DxSidebar>
      }
      topBar={
        topBarActions ? (
          <>
            <div />
            <div className={s.topBarActions}>{topBarActions}</div>
          </>
        ) : undefined
      }
    >
      {children}
    </DxAppFrame>
  );
}

function SidebarHeader({
  workspace,
  workspaceLink,
}: {
  workspace: string | undefined;
  workspaceLink: ReactElement | undefined;
}) {
  const workspaceLabel = workspace ?? "Local workspace";

  return (
    <div className={s.sidebarHeader}>
      <span className={s.sidebarBrand}>Situ</span>
      {renderWorkspaceLabel({ workspaceLabel, workspaceLink })}
    </div>
  );
}

function renderWorkspaceLabel({
  workspaceLabel,
  workspaceLink,
}: {
  workspaceLabel: string;
  workspaceLink: ReactElement | undefined;
}) {
  if (workspaceLink && isValidElement(workspaceLink)) {
    const link = workspaceLink as ReactElement<RenderableProps>;
    const linkProps = link.props;

    return (
      cloneElement(
        link,
        {
          ...linkProps,
          "aria-label": linkProps["aria-label"] ?? "Back to project selector",
          className: [s.sidebarWorkspace, s.sidebarWorkspaceLink, linkProps.className]
            .filter(Boolean)
            .join(" "),
          title: linkProps.title ?? "Back to project selector",
        },
        workspaceLabel,
      )
    );
  }

  return <span className={s.sidebarWorkspace}>{workspaceLabel}</span>;
}

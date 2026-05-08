import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DialogDescription, DialogTitle } from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { useNavigate } from "@tanstack/react-router";
import { MarkdownText } from "@situ/web-app-ui";
import { DxKbd } from "@situ/web-ui";
import {
  Activity,
  Beaker,
  BookOpen,
  CheckSquare,
  FileText,
  FlaskConical,
  GitBranch,
  ListChecks,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useProjectWorkspaceData } from "../project-workspace/context";
import * as s from "./command-palette.css";

type CommandPaletteContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen }}>
      {children}
      <CommandPalette />
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error("useCommandPalette used outside CommandPaletteProvider");
  }
  return ctx;
}

export function CommandPaletteHintButton() {
  const { setOpen } = useCommandPalette();
  return (
    <button
      type="button"
      className={s.hintButton}
      onClick={() => setOpen(true)}
      aria-label="Open command palette"
    >
      <Search size={12} className={s.hintIcon} />
      <span className={s.hintLabel}>Search</span>
      <DxKbd size="sm">⌘K</DxKbd>
    </button>
  );
}

type PageKind =
  | "overview"
  | "hypotheses"
  | "experiments"
  | "trajectory"
  | "evaluations"
  | "analyses"
  | "tasks"
  | "agents"
  | "events";

const PAGE_DEFS: Array<{
  kind: PageKind;
  label: string;
  icon: LucideIcon;
  to: (scope: ProjectRouteScope) => string;
}> = [
  { kind: "overview", label: "Overview", icon: FileText, to: (scope) => projectPath({ scope }) },
  { kind: "hypotheses", label: "Hypotheses", icon: Beaker, to: (scope) => projectPath({ scope, suffix: "hypotheses" }) },
  { kind: "experiments", label: "Experiments", icon: FlaskConical, to: (scope) => projectPath({ scope, suffix: "experiments" }) },
  { kind: "trajectory", label: "Trajectory", icon: GitBranch, to: (scope) => projectPath({ scope, suffix: "trajectory" }) },
  { kind: "evaluations", label: "Evaluations", icon: ListChecks, to: (scope) => projectPath({ scope, suffix: "evaluations" }) },
  { kind: "analyses", label: "Analyses", icon: BookOpen, to: (scope) => projectPath({ scope, suffix: "analyses" }) },
  { kind: "tasks", label: "Tasks", icon: CheckSquare, to: (scope) => projectPath({ scope, suffix: "tasks" }) },
  { kind: "agents", label: "Agents", icon: Users, to: (scope) => projectPath({ scope, suffix: "agents" }) },
  { kind: "events", label: "Events", icon: Activity, to: (scope) => projectPath({ scope, suffix: "events" }) },
];

type ProjectRouteScope = {
  projectId: string;
  workspaceId: string;
};

function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const data = useProjectWorkspaceData();
  const navigate = useNavigate();

  const scope = {
    projectId: data.projectId,
    workspaceId: data.workspaceId,
  };

  const go = (path: string) => {
    setOpen(false);
    navigate({ to: path });
  };

  const entityGroups = useMemo(() => {
    return [
      {
        heading: "Experiments",
        items: data.experiments.map((e) => ({
          key: `experiment-${e.id}`,
          id: e.id,
          title: e.title,
          path: projectPath({ scope, suffix: `experiments/${e.id}` }),
        })),
      },
      {
        heading: "Hypotheses",
        items: data.hypotheses.map((h) => ({
          key: `hypothesis-${h.id}`,
          id: h.id,
          title: h.title,
          path: projectPath({ scope, suffix: `hypotheses/${h.id}` }),
        })),
      },
      {
        heading: "Evaluations",
        items: data.evaluations.map((ev) => ({
          key: `evaluation-${ev.id}`,
          id: ev.id,
          title: ev.title,
          path: projectPath({ scope, suffix: `evaluations/${ev.id}` }),
        })),
      },
      {
        heading: "Analyses",
        items: data.analyses.map((a) => ({
          key: `analysis-${a.id}`,
          id: a.id,
          title: a.title,
          path: projectPath({ scope, suffix: `analyses/${a.id}` }),
        })),
      },
      {
        heading: "Tasks",
        items: data.tasks.map((t) => ({
          key: `task-${t.id}`,
          id: t.id,
          title: t.title,
          path: projectPath({ scope, suffix: `tasks/${t.id}` }),
        })),
      },
      {
        heading: "Agents",
        items: data.agents.map((ag) => ({
          key: `agent-${ag.id}`,
          id: ag.id,
          title: ag.display_name,
          path: projectPath({ scope, suffix: `agents/${ag.id}` }),
        })),
      },
    ].filter((group) => group.items.length > 0);
  }, [data, scope]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      className={s.dialog}
      overlayClassName={s.overlay}
      contentClassName={s.content}
    >
      <DialogTitle className={s.visuallyHidden}>Command palette</DialogTitle>
      <DialogDescription className={s.visuallyHidden}>
        Search project pages and records.
      </DialogDescription>
      <Command.Input
        placeholder="Jump to a page or entity…"
        className={s.input}
        autoFocus
      />
      <Command.List className={s.list}>
        <Command.Empty className={s.empty}>No results.</Command.Empty>

        <Command.Group heading="Pages" className={s.group}>
          {PAGE_DEFS.map((page) => (
            <Command.Item
              key={`page-${page.kind}`}
              value={`page ${page.label}`}
              onSelect={() => go(page.to(scope))}
              className={s.item}
            >
              <page.icon size={14} className={s.itemIcon} />
              <span className={s.itemLabel}>{page.label}</span>
              <span className={s.itemHint}>page</span>
            </Command.Item>
          ))}
        </Command.Group>

        {entityGroups.map((group) => (
          <Command.Group
            key={group.heading}
            heading={group.heading}
            className={s.group}
          >
            {group.items.map((item) => (
              <Command.Item
                key={item.key}
                value={`${item.id} ${item.title}`}
                onSelect={() => go(item.path)}
                className={s.item}
              >
                <span className={s.itemId}>{item.id}</span>
                <MarkdownText value={item.title} variant="inline" className={s.itemLabel} />
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}

function projectPath({
  scope,
  suffix,
}: {
  scope: ProjectRouteScope;
  suffix?: string;
}): string {
  const root = `/workspaces/${scope.workspaceId}/projects/${scope.projectId}`;
  return suffix ? `${root}/${suffix}` : root;
}

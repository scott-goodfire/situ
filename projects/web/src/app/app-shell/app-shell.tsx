import {
  DxAppFrame,
  DxBadge,
  DxButton,
  DxCard,
  DxSidebar,
  DxSidebarItem,
  DxSidebarSection,
  DxTextField,
  DxThemeToggle,
  useDxTheme,
  type DxSidebarItemProps,
  type DxThemeMode,
} from "@situ/web-ui";
import { useHotkey } from "@tanstack/react-hotkeys";
import { Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { ClipboardList, FolderOpen, LayoutDashboard, KeyRound, Save } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useReplicacheSynced } from "../replicache";
import { useLocalSettings } from "../../hooks/local-settings";
import { useResearchProjects } from "../../hooks/research-projects";
import { httpJsonModule } from "../../modules/http-json";
import { researchProjectModule } from "../../modules/research-project";
import * as s from "./app-shell.css";

const THEME_CYCLE: Record<DxThemeMode, DxThemeMode> = {
  light: "dark",
  dark: "auto",
  auto: "light",
};

export function AppShell() {
  const { mode, setMode } = useDxTheme();
  const synced = useReplicacheSynced();
  const localSettings = useLocalSettings();
  const researchProjects = useResearchProjects();
  const researchGoalsCount = researchProjects.length;
  const currentResearchProject = researchProjectModule.currentResearchProjectFrom({
    researchProjects,
  });
  const researchWorkspaceReady =
    currentResearchProject !== undefined &&
    researchProjectModule.isResearchProjectPastOnboarding({
      researchProject: currentResearchProject,
    });
  useHotkey("Mod+Shift+L", (event) => {
    event.preventDefault();
    setMode({ mode: THEME_CYCLE[mode] });
  });

  const topBar = !synced ? (
    <div className={s.topBar}>
      <span className={s.syncing}>Syncing...</span>
    </div>
  ) : undefined;
  const sidebarFooter = (
    <SidebarThemeFooter mode={mode} onChange={({ mode: next }) => setMode({ mode: next })} />
  );
  const settingsReady = localSettings?.anthropicKeyConfigured === true;

  if (!synced) {
    return (
      <DxAppFrame sidebar={<SettingsSidebar footer={sidebarFooter} />} topBar={topBar}>
        <div className={s.content}>
          <p className={s.syncingPanel}>Syncing local state...</p>
        </div>
      </DxAppFrame>
    );
  }

  if (!settingsReady) {
    return (
      <DxAppFrame sidebar={<SettingsSidebar footer={sidebarFooter} />} topBar={topBar}>
        <SettingsGate onSaveAnthropicKey={saveAnthropicKey} />
      </DxAppFrame>
    );
  }

  return (
    <DxAppFrame
      sidebar={
        <DxSidebar footer={sidebarFooter}>
          {!researchWorkspaceReady ? (
            <DxSidebarSection title="Setup">
              <NavItem
                to="/research-project"
                icon={<ClipboardList size={14} />}
                label="Research Goal"
                count={researchGoalsCount}
              />
            </DxSidebarSection>
          ) : (
            <DxSidebarSection title="Research">
              <NavItem to="/" icon={<LayoutDashboard size={14} />} label="Dashboard" />
              <NavItem to="/project" icon={<FolderOpen size={14} />} label="Project" />
            </DxSidebarSection>
          )}
        </DxSidebar>
      }
      topBar={topBar}
    >
      <ContentArea />
    </DxAppFrame>
  );
}

function ContentArea() {
  const matchRoute = useMatchRoute();
  const isDashboard = Boolean(matchRoute({ to: "/" }));
  return (
    <div className={isDashboard ? s.contentFullBleed : s.content}>
      <Outlet />
    </div>
  );
}

function SidebarThemeFooter({
  mode,
  onChange,
}: {
  mode: DxThemeMode;
  onChange: ({ mode }: { mode: DxThemeMode }) => void;
}) {
  return (
    <div className={s.sidebarThemeFooter}>
      <DxThemeToggle value={mode} onChange={onChange} />
    </div>
  );
}

function SettingsSidebar({ footer }: { footer: ReactNode }) {
  return (
    <DxSidebar footer={footer}>
      <DxSidebarSection title="Setup">
        <DxSidebarItem icon={<KeyRound size={14} />} label="Settings" active href="#" />
      </DxSidebarSection>
    </DxSidebar>
  );
}

function SettingsGate({
  onSaveAnthropicKey,
}: {
  onSaveAnthropicKey: (input: { anthropicKey: string }) => Promise<void>;
}) {
  const [anthropicKey, setAnthropicKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSaveAnthropicKey({ anthropicKey });
      setAnthropicKey("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={s.settingsGate}>
      <DxCard className={s.settingsCard}>
        <div className={s.settingsHeader}>
          <h1 className={s.settingsTitle}>Before we get started</h1>
          <p className={s.settingsText}>Save a local Anthropic API key to continue into situ.</p>
        </div>
        <form className={s.settingsForm} onSubmit={handleSubmit}>
          <DxTextField
            autoComplete="off"
            disabled={saving}
            error={error}
            label="Anthropic API key"
            onChange={(event) => setAnthropicKey(event.currentTarget.value)}
            placeholder="sk-ant-..."
            required
            type="password"
            value={anthropicKey}
          />
          <div className={s.settingsActions}>
            <DxButton
              disabled={saving || !anthropicKey.trim()}
              iconBefore={<Save size={14} />}
              type="submit"
              variant="primary"
            >
              {saving ? "Saving..." : "Save key"}
            </DxButton>
          </div>
        </form>
      </DxCard>
    </div>
  );
}

async function saveAnthropicKey({ anthropicKey }: { anthropicKey: string }): Promise<void> {
  await httpJsonModule.postJson({
    path: "/api/settings/anthropic-key",
    body: { anthropicKey },
  });
}

function NavItem({
  to,
  icon,
  label,
  count,
}: {
  to: string;
  icon: ReactNode;
  label: ReactNode;
  count?: number;
}) {
  const matchRoute = useMatchRoute();
  const active = Boolean(matchRoute({ to, fuzzy: true }));
  const props: DxSidebarItemProps = {
    icon,
    label,
    active,
    badge: count !== undefined && count > 0 ? <DxBadge>{count}</DxBadge> : undefined,
    render: <Link to={to} />,
  };
  return <DxSidebarItem {...props} />;
}

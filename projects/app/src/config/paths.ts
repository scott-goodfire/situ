import { join } from "node:path";
import { dbPathOverride, maybeRuntimeContext, runtimeLocalStateHome } from "./session-context";

export function localStateHome(): string {
  return runtimeLocalStateHome();
}

export function sqlitePath(): string {
  return (
    dbPathOverride() ??
    maybeRuntimeContext()?.sqlitePath ??
    join(localStateHome(), "sessions", "manual", "session.sqlite")
  );
}

export function secretsPath(): string {
  return process.env.SITU_SECRETS_PATH ?? join(localStateHome(), "secrets.json");
}

export function spaDistOverride(): string | null {
  const value = process.env.SITU_SPA_DIST?.trim();
  return value ? value : null;
}

export function agentSkillsDirOverride(): string | null {
  const value = process.env.SITU_AGENT_SKILLS_DIR?.trim();
  return value ? value : null;
}

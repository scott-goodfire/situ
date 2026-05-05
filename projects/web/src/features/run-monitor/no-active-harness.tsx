import { DxBadge } from "@situ/web-ui";

export function NoActiveHarness({ workspace }: { workspace: string | undefined }) {
  return (
    <main className="situ-shell">
      <header className="situ-topbar">
        <div>
          <h1>Situ</h1>
          <p>{workspace ?? "Local workspace"}</p>
        </div>
        <DxBadge>No session</DxBadge>
      </header>

      <section className="situ-empty">
        <h2>No active Situ harness found</h2>
        <p>Start a session from a terminal, then reopen this web monitor.</p>
        <pre className="situ-command">situ start</pre>
      </section>

      <p className="situ-status">No harness is started by the web monitor.</p>
    </main>
  );
}

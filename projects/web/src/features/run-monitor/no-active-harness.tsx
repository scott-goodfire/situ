import { DxBadge } from "@almanac/web-ui";

export function NoActiveHarness({ workspace }: { workspace: string | undefined }) {
  return (
    <main className="almanac-shell">
      <header className="almanac-topbar">
        <div>
          <h1>Almanac</h1>
          <p>{workspace ?? "Local workspace"}</p>
        </div>
        <DxBadge>No session</DxBadge>
      </header>

      <section className="almanac-empty">
        <h2>No active Almanac harness found</h2>
        <p>Start a session from a terminal, then reopen this web monitor.</p>
        <pre className="almanac-command">almanac start</pre>
      </section>

      <p className="almanac-status">No harness is started by the web monitor.</p>
    </main>
  );
}

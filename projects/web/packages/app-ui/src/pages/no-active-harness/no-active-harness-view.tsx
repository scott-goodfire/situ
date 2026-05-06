import { DxButton, DxEmptyState } from "@situ/web-ui";
import { commandPre } from "../../styles.css";

export function NoActiveHarnessView({
  workspace,
  onDownloadClick,
}: {
  workspace?: string;
  onDownloadClick?: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {workspace && (
        <p
          style={{
            margin: 0,
            color: "var(--muted-foreground-tertiary)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-product-sm)",
          }}
        >
          {workspace}
        </p>
      )}
      <DxEmptyState
        heading="No active Situ harness found"
        description="Start a session from a terminal, then reopen this web monitor."
        action={
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            <pre className={commandPre}>situ start</pre>
            {onDownloadClick && (
              <DxButton variant="primary" onClick={onDownloadClick}>
                Download for macOS
              </DxButton>
            )}
          </div>
        }
      />
    </div>
  );
}

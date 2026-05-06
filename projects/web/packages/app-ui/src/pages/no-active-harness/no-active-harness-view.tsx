import { DxButton, DxEmptyState } from "@situ/web-ui";
import * as s from "../../styles.css";

export function NoActiveHarnessView({
  workspace,
  onDownloadClick,
}: {
  workspace?: string;
  onDownloadClick?: () => void;
}) {
  return (
    <div className={s.viewStackTight}>
      {workspace && (
        <p className={s.monoTertiary} style={{ margin: 0 }}>
          {workspace}
        </p>
      )}
      <DxEmptyState
        heading="No active Situ harness found"
        description="Start a session from a terminal, then reopen this web monitor."
        action={
          <div className={s.harnessActionStack}>
            <pre className={s.commandPre}>situ start</pre>
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

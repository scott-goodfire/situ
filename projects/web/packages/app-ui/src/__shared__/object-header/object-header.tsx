import type { ReactNode } from "react";
import * as s from "../../styles.css";

export function ObjectHeader({
  back,
  eyebrow,
  title,
  status,
  summary,
  badges,
}: {
  back?: ReactNode;
  eyebrow: ReactNode;
  title: ReactNode;
  status: ReactNode;
  summary?: ReactNode;
  badges?: ReactNode;
}) {
  return (
    <section className={s.objectPage}>
      {back && <div className={s.objectPageBack}>{back}</div>}
      <div className={s.objectPageHeader}>
        <div className={s.objectPageHeaderText}>
          <p className={s.objectPageEyebrow}>{eyebrow}</p>
          <h2 className={s.objectPageTitle}>{title}</h2>
        </div>
        {status}
      </div>
      {summary && <p className={s.objectPageSummary}>{summary}</p>}
      {badges && <div className={s.objectPageBadgeRow}>{badges}</div>}
    </section>
  );
}

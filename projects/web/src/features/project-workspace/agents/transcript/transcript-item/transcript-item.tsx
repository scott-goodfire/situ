import { Link } from "@tanstack/react-router";
import { DateTime } from "luxon";
import * as s from "../../../../../styles.css";
import type { AgentTranscriptItem } from "../../../../../selectors/agents";

export function TranscriptItem({
  item,
  projectId,
  isLatest,
}: {
  item: AgentTranscriptItem;
  projectId: string;
  isLatest: boolean;
}) {
  return (
    <article
      className={s.transcriptItem}
      data-tone={item.tone}
      data-latest={isLatest}
    >
      <div className={s.transcriptItemRail} aria-hidden="true">
        <span className={s.transcriptItemDot} />
      </div>

      <div className={s.transcriptItemContent}>
        <header className={s.transcriptItemHeader}>
          <div className={s.transcriptItemTitle}>
            <span>{item.title}</span>
            <span className={s.transcriptItemPreposition}>on</span>
            <EntityLink item={item} projectId={projectId} />
          </div>
          <time dateTime={item.createdAt}>{formatTime({ value: item.createdAt })}</time>
        </header>

        <p className={s.transcriptItemBody}>{item.body}</p>

        <footer className={s.transcriptItemMeta}>
          <span>{item.entity.kind}</span>
          <span>{item.activityType}</span>
        </footer>
      </div>
    </article>
  );
}

function EntityLink({
  item,
  projectId,
}: {
  item: AgentTranscriptItem;
  projectId: string;
}) {
  if (item.entity.kind === "hypothesis") {
    return (
      <Link
        className={s.recordLink}
        to="/projects/$projectId/hypotheses/$hypothesisId"
        params={{
          projectId,
          hypothesisId: item.entity.id,
        }}
      >
        {item.entity.title}
      </Link>
    );
  }

  if (item.entity.kind === "experiment") {
    return (
      <Link
        className={s.recordLink}
        to="/projects/$projectId/experiments/$experimentId"
        params={{
          projectId,
          experimentId: item.entity.id,
        }}
      >
        {item.entity.title}
      </Link>
    );
  }

  return (
    <Link
      className={s.recordLink}
      to="/projects/$projectId/evaluations/$evaluationId"
      params={{
        projectId,
        evaluationId: item.entity.id,
      }}
    >
      {item.entity.title}
    </Link>
  );
}

function formatTime({
  value,
}: {
  value: string;
}): string {
  return DateTime.fromISO(value).toLocaleString(DateTime.TIME_WITH_SECONDS);
}

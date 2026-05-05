import { Link } from "@tanstack/react-router";
import { DateTime } from "luxon";
import type { AgentTranscriptItem } from "./types";

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
      className="almanac-transcript-item"
      data-tone={item.tone}
      data-latest={isLatest}
    >
      <div className="almanac-transcript-item__rail" aria-hidden="true">
        <span className="almanac-transcript-item__dot" />
      </div>

      <div className="almanac-transcript-item__content">
        <header className="almanac-transcript-item__header">
          <div className="almanac-transcript-item__title">
            <span>{item.title}</span>
            <span className="almanac-transcript-item__preposition">on</span>
            <EntityLink item={item} projectId={projectId} />
          </div>
          <time dateTime={item.createdAt}>{formatTime({ value: item.createdAt })}</time>
        </header>

        <p className="almanac-transcript-item__body">{item.body}</p>

        <footer className="almanac-transcript-item__meta">
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
        className="almanac-record-link"
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
        className="almanac-record-link"
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
      className="almanac-record-link"
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

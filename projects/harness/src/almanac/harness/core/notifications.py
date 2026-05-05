from __future__ import annotations

from typing import Any, Callable

NotificationWriter = Callable[[str, dict[str, Any]], None]

_WRITERS: dict[str, NotificationWriter] = {}
_EVENT_SUBSCRIPTIONS: set[str] = set()
_COLLECTION_SUBSCRIPTIONS: set[str] = set()


def register_project_notifications(project_id: str, writer: NotificationWriter) -> None:
    _WRITERS[project_id] = writer


def set_project_events_subscribed(project_id: str, subscribed: bool) -> None:
    if subscribed:
        _EVENT_SUBSCRIPTIONS.add(project_id)
    else:
        _EVENT_SUBSCRIPTIONS.discard(project_id)


def set_project_collections_subscribed(project_id: str, subscribed: bool) -> None:
    if subscribed:
        _COLLECTION_SUBSCRIPTIONS.add(project_id)
    else:
        _COLLECTION_SUBSCRIPTIONS.discard(project_id)


def emit_project_event(project_id: str | None, event: dict[str, Any]) -> None:
    if project_id is None or project_id not in _EVENT_SUBSCRIPTIONS:
        return
    writer = _WRITERS.get(project_id)
    if writer is not None:
        writer("event.appended", {"event": event})


def emit_collection_upsert(
    project_id: str | None,
    collection: str,
    key: str,
    record: dict[str, Any],
    *,
    cursor: int | None,
) -> None:
    if project_id is None or cursor is None or project_id not in _COLLECTION_SUBSCRIPTIONS:
        return
    writer = _WRITERS.get(project_id)
    if writer is not None:
        writer(
            "collections.upserted",
            {
                "cursor": cursor,
                "collection": collection,
                "key": key,
                "record": record,
            },
        )

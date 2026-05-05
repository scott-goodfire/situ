from __future__ import annotations

from typing import Any, Callable

NotificationWriter = Callable[[str, dict[str, Any]], None]

_WRITERS: dict[str, NotificationWriter] = {}
_COLLECTION_SUBSCRIPTIONS: set[str] = set()
_EVENT_SUBSCRIPTIONS: set[str] = set()


def register_project_notification_writer(
    project_id: str,
    writer: NotificationWriter,
) -> None:
    _WRITERS[project_id] = writer


def unregister_project_notification_writer(project_id: str) -> None:
    _WRITERS.pop(project_id, None)
    _COLLECTION_SUBSCRIPTIONS.discard(project_id)
    _EVENT_SUBSCRIPTIONS.discard(project_id)


def set_project_collection_subscribed(project_id: str, subscribed: bool) -> None:
    if subscribed:
        _COLLECTION_SUBSCRIPTIONS.add(project_id)
    else:
        _COLLECTION_SUBSCRIPTIONS.discard(project_id)


def set_project_events_subscribed(project_id: str, subscribed: bool) -> None:
    if subscribed:
        _EVENT_SUBSCRIPTIONS.add(project_id)
    else:
        _EVENT_SUBSCRIPTIONS.discard(project_id)


def emit_project_event(project_id: str, event: dict[str, Any]) -> None:
    writer = _WRITERS.get(project_id)
    if writer is None or project_id not in _EVENT_SUBSCRIPTIONS:
        return
    writer("event.appended", {"event": event})


def emit_collection_upsert(
    project_id: str,
    collection: str,
    key: str,
    record: dict[str, Any],
    *,
    cursor: int,
) -> None:
    writer = _WRITERS.get(project_id)
    if writer is None or project_id not in _COLLECTION_SUBSCRIPTIONS:
        return
    writer(
        "collections.upserted",
        {
            "cursor": cursor,
            "collection": collection,
            "key": key,
            "record": record,
        },
    )

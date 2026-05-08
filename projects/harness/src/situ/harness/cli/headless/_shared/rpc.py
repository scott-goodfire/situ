from __future__ import annotations

import json
from collections.abc import Iterator
from typing import Any
import urllib.error
import urllib.parse
import urllib.request

from .output import write_json_line


def rpc_request(
    session: dict[str, str],
    method: str,
    params: dict[str, Any] | None = None,
    *,
    timeout: float = 10,
) -> dict[str, Any]:
    body = json.dumps(
        {
            "method": method,
            "params": params or {},
            "workspace": session.get("workspace"),
            "project_id": session.get("project_id"),
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        f"{session['url']}/rpc",
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"RPC {method} failed with HTTP {error.code}: {detail}") from error

    if payload.get("error"):
        error = payload["error"]
        if isinstance(error, dict):
            raise RuntimeError(str(error.get("message", error)))
        raise RuntimeError(str(error))

    result = payload.get("result")
    if isinstance(result, dict):
        return result
    return {}


def open_event_stream(session: dict[str, str]) -> Any:
    query = urllib.parse.urlencode(
        {
            "workspace": session.get("workspace", ""),
            "project_id": session.get("project_id", ""),
        }
    )
    request = urllib.request.Request(f"{session['url']}/events?{query}")
    return urllib.request.urlopen(request)


def iter_sse_notifications(response: Any) -> Iterator[dict[str, Any]]:
    data_lines: list[str] = []
    for raw_line in response:
        line = raw_line.decode("utf-8").rstrip("\r\n")
        if line:
            if line.startswith("data:"):
                data_lines.append(line[len("data:") :].lstrip())
            continue

        if not data_lines:
            continue

        data = "\n".join(data_lines)
        data_lines = []
        try:
            notification = json.loads(data)
        except json.JSONDecodeError:
            continue

        if isinstance(notification, dict) and notification.get("method"):
            yield notification


def write_notification(notification: dict[str, Any]) -> None:
    params = notification.get("params")
    if notification.get("method") == "event.appended" and isinstance(params, dict):
        event = params.get("event")
        if event is not None:
            write_json_line({"type": "event", "event": event})
            return

    write_json_line({"type": "notification", "notification": notification})

import sys
import threading
from pathlib import Path
from typing import Any

from almanac.protocol.jsonrpc import JsonRpcNotification, JsonRpcRequest, JsonRpcResponse
from pydantic import ValidationError

from .app import HarnessApp, MethodNotFound
from .core.paths import resolve_app_root, resolve_workspace

WRITE_LOCK = threading.Lock()


def dispatch(app: HarnessApp, request: JsonRpcRequest) -> JsonRpcResponse | None:
    if request.id is None:
        return None

    try:
        result = app.handle(request.method, request.params)
    except MethodNotFound:
        return JsonRpcResponse.method_not_found(request.id, request.method)
    except ValidationError as error:
        return JsonRpcResponse.invalid_params(
            request.id,
            "invalid params",
            error.errors(include_url=False),
        )
    except Exception as error:
        return JsonRpcResponse.error_response(request.id, -32000, str(error))

    return JsonRpcResponse.result_response(request.id, result)


def write_message(message: JsonRpcResponse | JsonRpcNotification) -> None:
    with WRITE_LOCK:
        sys.stdout.write(message.model_dump_json(exclude_none=True))
        sys.stdout.write("\n")
        sys.stdout.flush()


def write_notification(method: str, params: dict[str, Any]) -> None:
    write_message(JsonRpcNotification(method=method, params=params))


def main() -> None:
    workspace = resolve_workspace(Path.cwd())
    app = HarnessApp(workspace, notify=write_notification, app_root=resolve_app_root(Path(__file__)))
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = JsonRpcRequest.model_validate_json(line)
        except ValidationError as error:
            write_message(
                JsonRpcResponse.invalid_request(
                    "invalid request",
                    error.errors(include_url=False),
                )
            )
            continue
        except ValueError as error:
            write_message(JsonRpcResponse.parse_error(str(error)))
            continue

        response = dispatch(app, request)
        if response is not None:
            write_message(response)

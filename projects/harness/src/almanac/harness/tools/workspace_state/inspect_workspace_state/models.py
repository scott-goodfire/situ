from __future__ import annotations

from typing import Any

from ...common import AlmanacToolReturn


class InspectWorkspaceState(AlmanacToolReturn):
    workspace_state: dict[str, Any] | None = None

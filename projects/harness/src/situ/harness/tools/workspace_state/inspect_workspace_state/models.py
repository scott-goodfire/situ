from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class InspectWorkspaceState(SituToolReturn):
    workspace_state: dict[str, Any] | None = None

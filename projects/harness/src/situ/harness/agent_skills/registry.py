from __future__ import annotations

from pathlib import Path
from typing import Any

from pydantic_ai.capabilities.abstract import AbstractCapability
from pydantic_ai_skills import SkillsCapability

_SKILLS_ROOT = Path(__file__).resolve().parent


def build_manager_skill_capabilities() -> list[AbstractCapability[Any]]:
    return [
        _build_skill_capability(
            role="manager",
            directories=[
                _SKILLS_ROOT / "shared",
                _SKILLS_ROOT / "manager",
            ],
        )
    ]


def build_researcher_skill_capabilities() -> list[AbstractCapability[Any]]:
    return [
        _build_skill_capability(
            role="researcher",
            directories=[
                _SKILLS_ROOT / "shared",
                _SKILLS_ROOT / "researcher",
            ],
        )
    ]


def _build_skill_capability(
    *,
    role: str,
    directories: list[Path],
) -> SkillsCapability:
    return SkillsCapability(
        directories=directories,
        validate=True,
        max_depth=2,
        id=f"situ.{role}.skills.v1",
    )

"""Tests for runtime skill content (per policy 0025-runtime-skills).

These are static checks on SKILL.md files under agent_skills/. The runtime
loading behavior is exercised by test_agent_runtime.py; this file guards
the file-format and task-kind-coverage invariants the policy requires.
"""
from __future__ import annotations

from pathlib import Path

from situ.harness.records import TaskKind

AGENT_SKILLS_ROOT = (
    Path(__file__).resolve().parents[1]
    / "src"
    / "situ"
    / "harness"
    / "agent_skills"
)


def _all_skill_files() -> list[Path]:
    return sorted(AGENT_SKILLS_ROOT.glob("*/*/SKILL.md"))


def test_runtime_skills_have_complete_frontmatter() -> None:
    """Per policy 0025-runtime-skills, every SKILL.md carries `name:` and
    `description:` frontmatter so role prompts can advertise it and the
    Pydantic AI skills capability can discover it."""
    skill_files = _all_skill_files()
    assert skill_files, "expected SKILL.md files under agent_skills/<role>/<skill>/"
    for skill_path in skill_files:
        text = skill_path.read_text()
        relative = skill_path.relative_to(AGENT_SKILLS_ROOT)
        assert text.startswith("---\n"), (
            f"{relative} missing frontmatter opener (---)"
        )
        try:
            frontmatter_end = text.index("\n---\n", 4)
        except ValueError as error:
            raise AssertionError(
                f"{relative} frontmatter is unterminated"
            ) from error
        frontmatter = text[4:frontmatter_end]
        assert "name:" in frontmatter, f"{relative} frontmatter missing name:"
        assert "description:" in frontmatter, (
            f"{relative} frontmatter missing description:"
        )


def test_task_kind_skill_mapping() -> None:
    """Per policy 0025-runtime-skills, every executable TaskKind has at
    least one default runtime skill in some role directory. Each skill
    whose work executes a task kind is named with that kind as a prefix
    (e.g., `research-task`, `planning-pass` for `plan`)."""
    skill_dirs_by_role = {
        role.name: [s.name for s in role.iterdir() if s.is_dir() and s.name != "__pycache__"]
        for role in AGENT_SKILLS_ROOT.iterdir()
        if role.is_dir() and role.name != "__pycache__"
    }
    all_skill_names: list[str] = []
    for skills in skill_dirs_by_role.values():
        all_skill_names.extend(skills)

    for kind in TaskKind:
        # `plan` is matched by `planning-pass`; other kinds match
        # `<kind>-task`. Either covers the policy requirement: one
        # skill whose name starts with the task-kind value.
        matching = [name for name in all_skill_names if name.startswith(kind.value)]
        assert matching, (
            f"TaskKind.{kind.name} ({kind.value!r}) has no default runtime "
            f"skill in any role directory; policy 0025 requires every "
            f"executable task kind to have a default skill."
        )


def test_experiment_task_skill_stops_replicating_after_hard_timeout() -> None:
    skill = (
        AGENT_SKILLS_ROOT
        / "scientist"
        / "experiment-task"
        / "SKILL.md"
    ).read_text()

    assert "hard timeout" in skill
    assert "do not spend additional replicate runs" in skill

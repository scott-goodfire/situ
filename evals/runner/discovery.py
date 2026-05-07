from __future__ import annotations

import inspect
import sys
from importlib import util
from pathlib import Path
from typing import Any

from evals.framework import BaseSituEvalGroup


def collect_eval_classes(path: Path) -> list[tuple[str, type[BaseSituEvalGroup[Any, Any]]]]:
    repo_root = Path.cwd().resolve()
    files = [path] if path.is_file() else sorted(path.rglob("*.py"))
    eval_classes: list[tuple[str, type[BaseSituEvalGroup[Any, Any]]]] = []
    skip_parts = {"__pycache__", "harness", "worlds"}

    for file in files:
        if file.name == "__init__.py" or any(part in skip_parts for part in file.parts):
            continue

        try:
            resolved = file.resolve()
            module_name = resolved.relative_to(repo_root).with_suffix("").as_posix().replace("/", ".")
            spec = util.spec_from_file_location(module_name, resolved)
            if spec is None or spec.loader is None:
                continue
            module = util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)

            for obj_name, obj in inspect.getmembers(module):
                if (
                    inspect.isclass(obj)
                    and issubclass(obj, BaseSituEvalGroup)
                    and obj is not BaseSituEvalGroup
                    and not inspect.isabstract(obj)
                ):
                    eval_classes.append((obj_name, obj))
        except Exception as error:
            print(f"Error importing {file}: {error}", file=sys.stderr)

    return eval_classes

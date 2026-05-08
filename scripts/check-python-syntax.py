from __future__ import annotations

import py_compile
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CHECK_DIRS = [
    ROOT / "projects" / "harness" / "src",
    ROOT / "shared" / "python" / "protocol" / "src",
    ROOT / "scripts",
]


def main() -> int:
    failures: list[str] = []
    for directory in CHECK_DIRS:
        for path in sorted(directory.rglob("*.py")):
            try:
                py_compile.compile(str(path), doraise=True)
            except py_compile.PyCompileError as error:
                failures.append(f"{path}: {error.msg}")

    if failures:
        for failure in failures:
            print(failure, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Frontend / TypeScript-side invariants.

These run from Python by walking the JS/TS file tree under projects/web/
and projects/tui/. They guard the package-boundary, naming, and
read-only-monitor commitments that don't have a natural home in the
Bun/Vite test suites.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
WEB_SRC = REPO_ROOT / "projects" / "web" / "src"
TUI_SRC = REPO_ROOT / "projects" / "tui" / "src"
DESIGN_TOKENS_SRC = REPO_ROOT / "projects" / "web" / "packages" / "design-tokens" / "src"
WEB_SERVER_DIR = WEB_SRC / "server"

# Filenames that legitimately use non-kebab casing — framework conventions
# that the lint sweep should not flag. Add here only when justified.
KEBAB_CASE_EXEMPTIONS: set[str] = set()


def _frontend_source_files(root: Path) -> list[Path]:
    if not root.is_dir():
        return []
    return [
        p
        for p in root.rglob("*")
        if p.is_file()
        and p.suffix in {".ts", ".tsx"}
        and "node_modules" not in p.parts
        and "dist" not in p.parts
    ]


def test_frontend_files_use_kebab_case() -> None:
    """Per policy 0013-frontend-code-style, frontend file names are
    kebab-cased. Catches drift toward camelCase or PascalCase that
    accumulates as the codebase grows."""
    violations: list[str] = []
    for source_root in (WEB_SRC, TUI_SRC):
        for path in _frontend_source_files(source_root):
            stem = path.stem.split(".")[0]
            if stem in KEBAB_CASE_EXEMPTIONS:
                continue
            if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", stem):
                violations.append(str(path.relative_to(REPO_ROOT)))
    assert not violations, (
        "non-kebab-case frontend filenames (per policy 0013):\n  "
        + "\n  ".join(violations)
    )


def test_design_tokens_no_react_imports() -> None:
    """Per policy 0031-ui-package-boundaries, the design-tokens package is
    pure CSS/values and must not depend on React. A React import would
    pull the package out of the foundation layer."""
    if not DESIGN_TOKENS_SRC.is_dir():
        pytest.skip("design-tokens src not present")
    for path in DESIGN_TOKENS_SRC.rglob("*"):
        if not path.is_file() or path.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
            continue
        text = path.read_text()
        assert "from \"react\"" not in text and "from 'react'" not in text, (
            f"{path.relative_to(REPO_ROOT)} imports React; design-tokens "
            "stays in the foundation layer per policy 0031."
        )


def test_package_boundaries_no_deep_relative_imports_in_selectors() -> None:
    """Per policy 0029-typescript-workspace-packages, selectors should not
    reach across the workspace via `../../../` relative paths. Cross-
    workspace imports go through the `@situ/...` package exports."""
    selectors_root = WEB_SRC / "selectors"
    if not selectors_root.is_dir():
        pytest.skip("selectors directory not present")
    violations: list[str] = []
    for path in selectors_root.rglob("*.ts"):
        text = path.read_text()
        if re.search(r"from ['\"]\.\./\.\./\.\./", text):
            violations.append(str(path.relative_to(REPO_ROOT)))
    assert not violations, (
        "selectors with `../../../` deep-relative imports:\n  "
        + "\n  ".join(violations)
    )


def test_selector_exports_indexed() -> None:
    """Every selectors/<entity>/index.ts re-exports from at least one
    sibling module so the entity surface is reachable through the
    package's public path. Catches index.ts files that are accidentally
    empty or out of sync with their siblings."""
    selectors_root = WEB_SRC / "selectors"
    if not selectors_root.is_dir():
        pytest.skip("selectors directory not present")
    index_files = sorted(selectors_root.glob("*/index.ts"))
    assert index_files, "expected per-entity index.ts under selectors/"
    for index_path in index_files:
        text = index_path.read_text()
        # Must re-export from at least one sibling module.
        assert re.search(r"from ['\"]\./", text), (
            f"{index_path.relative_to(REPO_ROOT)} does not re-export from "
            "any sibling module"
        )


def test_web_package_does_not_ship_local_http_server() -> None:
    """The web package is a static client. Local HTTP endpoints live in
    projects/session-server so app APIs, RPC, events, and static assets
    share one runtime origin."""
    server_files: list[Path] = []
    if WEB_SERVER_DIR.exists():
        server_files = [path for path in WEB_SERVER_DIR.rglob("*") if path.is_file()]
    assert not server_files, (
        "projects/web/src/server reintroduces a second local HTTP server; "
        "serve app APIs and web assets from projects/session-server:\n  "
        + "\n  ".join(str(path.relative_to(REPO_ROOT)) for path in server_files)
    )

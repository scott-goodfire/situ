# Distribution and Install

This spec defines how the running Situ CLI gets onto a user's machine: what is
installed, where it lives on disk, how updates work, and what guarantees the
install artifact carries. It narrows
[0014-local-app-runtime](../0014-local-app-runtime/SPEC.md), which defines
`situ app/tui/web/exec` behavior once installed.

## Purpose

Situ is a single command on a user's machine. A user installs Situ with one
shell command, runs `situ`, and gets a working CLI without a Bun, uv, or Node
toolchain on PATH. Updates and uninstalls are equally simple and leave the
user's product data intact.

The installed CLI requires Python 3.13 or newer on the user's PATH. An
embedded-interpreter distribution that removes that prerequisite is listed
under `## Deferred`.

## Install Contract

Installing Situ is a single curl-shell command that writes to user-owned paths
only.

- The install command does not require sudo.
- The install command writes only under `$HOME`.
- The install command writes the running CLI to a versioned install directory
  and symlinks an entry point onto PATH.
- The install command verifies the downloaded artifact against a published
  checksum.
- The install command supports pinning to a specific release version.
- The install command is idempotent: running it again upgrades or repairs in
  place and preserves `~/.situ/` product data.

The install layout separates installed code from runtime data:

```text
~/.local/share/situ/versions/<tag>/    installed code, swapped on upgrade
~/.local/share/situ/current -> versions/<tag>
~/.local/bin/situ -> ~/.local/share/situ/current/bin/situ
~/.situ/                               canonical product state, see 0014
```

`~/.situ/` is owned by the running CLI as runtime state and survives install,
upgrade, and uninstall. Removing `~/.local/share/situ/` and the
`~/.local/bin/situ` symlink fully uninstalls the CLI.

## Release Artifact

A release publishes one self-contained bundle per supported platform. Each
bundle contains the Python harness wheel(s), the prebuilt frontend assets,
and the platform-specific Bun-compiled executables required by the harness.
The end-user install does not require `bun`, `uv`, or `node` on PATH; the
installer uses the user's existing Python 3.13+ to provision an isolated
runtime under the install directory.

Supported platforms:

- `darwin-arm64`
- `darwin-x64`
- `linux-arm64`
- `linux-x64`

Every release publishes a `checksums.txt` covering all platform artifacts
under that tag. The release tag, or an explicit `SITU_VERSION`, is the
authoritative version for the artifact name and contents.

## Bundled Runtime Layout

Inside the installed bundle, the Python harness resolves its sibling runtimes
through bundled package data:

```text
<install>/situ/_bundled/tui                platform-specific Bun executable
<install>/situ/_bundled/session-server     platform-specific Bun executable
<install>/situ/_bundled/web-server         platform-specific Bun executable
<install>/situ/_bundled/web/               prebuilt frontend static assets
```

The harness loads these via `importlib.resources` and exec's the binaries as
subprocesses. The installed CLI exec's `_bundled/tui` for `situ tui`,
`_bundled/session-server` for `situ app`, and `_bundled/web-server` for
`situ web`. The web server serves `_bundled/web/` as its static asset root.

## Update and Uninstall

`situ self update` replaces the contents of the install directory with a
newer release and re-points the `current` symlink. Failed updates leave the
previous installed version usable.

Uninstall is removing `~/.local/share/situ/` and the `~/.local/bin/situ`
symlink. The user's `~/.situ/` product state survives uninstall and is read
unchanged by a subsequent fresh install.

## Source Checkouts

Running Situ from a source checkout remains a supported development surface.
A source checkout reads JS and Bun runtimes from the repo's `projects/*`
paths and uses the local toolchain (`bun`, `uv`). The installed CLI and the
source CLI share the same Python harness code, the same product records, and
the same `~/.situ/` runtime state.

## Deferred

- A single-binary distribution that embeds its own Python interpreter.
- macOS code signing and notarization.
- Windows installer support.
- Homebrew tap, `apt`, `dnf`, or other OS-package channels.
- Auto-update on CLI launch.
- Air-gapped install.
- PyPI publication of the harness wheel. The current wheel is tagged
  `py3-none-any` while its `_bundled/` payload is platform-specific; this is
  safe because each release tarball ships the correct wheel for its own
  platform, but a PyPI publication would require real platform tags
  (`...macosx_11_0_arm64.whl`, `...manylinux_2_17_x86_64.whl`, etc.) so pip
  routes users to the wheel matching their machine.

## Review Criteria

- A user with Python 3.13 on PATH but no `bun`, `uv`, or `node` installed runs
  the published curl install command and ends up with a working `situ` on
  PATH.
- The install flow does not prompt for sudo and only writes paths under
  `$HOME`.
- Running the install command a second time upgrades to the latest release
  without prompting and without losing `~/.situ/` data.
- The installed `situ` binary launches `situ app`, `situ tui`, `situ web`,
  and `situ exec` against the bundled JS and Bun runtimes.
- A release's `checksums.txt` covers every platform artifact published under
  the same tag, and the installer rejects an artifact whose checksum does
  not match.
- Removing `~/.local/share/situ/` and the `~/.local/bin/situ` symlink leaves
  no Situ installation on the system but preserves `~/.situ/` product state.
- A subsequent fresh install reads the existing `~/.situ/situ.sqlite`
  unchanged and presents the same projects, sessions, and records.

## References

The install model is informed by established precedents for distributing
Python CLIs that ship a non-Python runtime as part of the installable
artifact. These references are background for future implementation work and
review; the contract above holds independently of which precedent path is
chosen.

Wheel-bundled binary precedents:

- [pybun on PyPI](https://pypi.org/project/pybun/) — ships the Bun
  executable as bundled binary data inside per-platform Python wheels.
- [ziglang on PyPI](https://pypi.org/project/ziglang/) — ships a full
  toolchain as bundled binary data inside per-platform Python wheels.
- [playwright on PyPI](https://pypi.org/project/playwright/) — splits a
  small wheel from larger runtime artifacts fetched on first run.

Wheel-bundled JS frontend precedents:

- [hatch-jupyter-builder](https://github.com/jupyterlab/hatch-jupyter-builder)
  — JupyterLab's pattern for bundling a built JS frontend inside a Python
  wheel.
- [Streamlit package-based components](https://docs.streamlit.io/develop/concepts/custom-components/components-v2/package-based).
- [Reflex architecture](https://reflex.dev/blog/reflex-architecture/) —
  Python-first app with a bundled JS surface.

Single-binary wrappers around a Python wheel:

- [PyApp](https://github.com/ofek/pyapp) — Rust wrapper that turns a
  Python wheel into a single per-platform binary using
  `python-build-standalone` on first run.
- [python-build-standalone](https://github.com/astral-sh/python-build-standalone)
  — relocatable Python interpreters used by `uv`, `rye`, and PyApp.

Build inputs for the bundled JS runtimes:

- [Bun single-file executables](https://bun.com/docs/bundler/executables)
  — `bun build --compile --target=$TARGET` produces the per-platform
  executables for `tui` and `session-server`.

Curl-shell installer shape:

- [Astral `uv` install script](https://astral.sh/uv/install.sh) and
  [Ruff installation](https://docs.astral.sh/ruff/installation/) — reference
  shapes for a curl-shell installer that writes only under `$HOME`.

Background writeup:

- [Simon Willison: bundling binary tools in Python wheels](https://simonwillison.net/2022/May/23/bundling-binary-tools-in-python-wheels/).

from __future__ import annotations

import argparse
import asyncio
import os
import shutil
import subprocess
import sys
from pathlib import Path

from ....core.install_info import install_info


DEFAULT_REPO = "scott-goodfire/autoresearch-harness"
INSTALL_SCRIPT_PATH = "config/scripts/install.sh"


def run(args: argparse.Namespace) -> int:
    return asyncio.run(run_async(args))


async def run_async(args: argparse.Namespace) -> int:
    sub = getattr(args, "self_command", None)
    if sub == "update":
        return await update(args)
    if sub == "uninstall":
        return await uninstall(args)
    sys.stderr.write("unknown self command\n")
    return 2


async def update(args: argparse.Namespace) -> int:
    info = install_info()
    if info.method != "curl":
        sys.stderr.write(
            f"situ was not installed via the curl installer (detected method: {info.method}).\n"
            f"Re-run the install command from the docs to update.\n"
        )
        return 1

    target = args.version or "latest"
    if target != "latest" and target == info.version:
        sys.stdout.write(f"situ is already on {info.version}\n")
        return 0

    repo = os.environ.get("SITU_RELEASE_REPO", DEFAULT_REPO)
    install_url = f"https://raw.githubusercontent.com/{repo}/main/{INSTALL_SCRIPT_PATH}"
    sys.stdout.write(f"==> updating situ to {target}\n")

    env = os.environ.copy()
    env["SITU_VERSION"] = target
    return subprocess.run(
        ["bash", "-c", f'curl -fsSL "{install_url}" | bash'],
        env=env,
    ).returncode


async def uninstall(args: argparse.Namespace) -> int:
    info = install_info()
    if info.install_home is None:
        sys.stderr.write(
            "situ does not appear to be curl-installed.\n"
            "Remove the install directory manually if you installed it some other way.\n"
        )
        return 1

    bin_dir = Path(os.environ.get("SITU_BIN_DIR", str(Path.home() / ".local" / "bin")))
    bin_link = bin_dir / "situ"

    targets: list[Path] = [info.install_home]
    if bin_link.is_symlink() or bin_link.exists():
        targets.append(bin_link)

    if not args.yes:
        sys.stdout.write("This will remove:\n")
        for target in targets:
            sys.stdout.write(f"  {target}\n")
        sys.stdout.write("\nYour product state at ~/.situ/ is preserved.\n")
        sys.stdout.write("Continue? [y/N] ")
        sys.stdout.flush()
        try:
            answer = input().strip().lower()
        except EOFError:
            answer = ""
        if answer not in ("y", "yes"):
            sys.stdout.write("aborted\n")
            return 1

    shutil.rmtree(info.install_home, ignore_errors=False)
    if bin_link.is_symlink() or bin_link.is_file():
        bin_link.unlink()

    sys.stdout.write("situ uninstalled\n")
    return 0

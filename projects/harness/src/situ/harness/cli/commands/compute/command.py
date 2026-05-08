from __future__ import annotations

import argparse
import asyncio
import json

from ....config import DEFAULTS
from ....core.db import Database
from ....core.task_execution import CUDA_VISIBLE_DEVICES_METADATA_KEY
from ....records import ComputeTargetStatus
from ....repositories import Repositories


def run(args: argparse.Namespace) -> int:
    return asyncio.run(run_async(args))


async def run_async(args: argparse.Namespace) -> int:
    subcommand = getattr(args, "compute_command", None)
    if subcommand == "add":
        return await _run_add(args)
    if subcommand == "list":
        return await _run_list(args)
    if subcommand == "remove":
        return await _run_remove(args)
    print(f"unknown compute command: {subcommand}")
    return 2


async def _open_global_repos() -> Repositories:
    home = DEFAULTS.local_state_home_path()
    db = Database(
        home / "situ.sqlite",
        workspace_id="install",
        repo_path=str(home),
    )
    await db.initialize()
    return Repositories.create(db)


async def _run_add(args: argparse.Namespace) -> int:
    metadata = {}
    if args.metadata_json:
        try:
            metadata = json.loads(args.metadata_json)
        except json.JSONDecodeError as error:
            print(f"invalid --metadata-json: {error}")
            return 2
        if not isinstance(metadata, dict):
            print("--metadata-json must decode to a JSON object")
            return 2
    cuda_visible_devices = getattr(args, "cuda_visible_devices", None)
    if cuda_visible_devices is not None:
        metadata[CUDA_VISIBLE_DEVICES_METADATA_KEY] = cuda_visible_devices
    repos = await _open_global_repos()
    target = await repos.compute_targets.register(
        pool=args.pool,
        label=args.label,
        metadata=metadata,
    )
    await repos.events.add(
        event_type="compute_target.registered",
        message=f"Registered compute target {target.id}",
        payload={
            "target_id": target.id,
            "pool": target.pool,
        },
    )
    if args.json:
        print(json.dumps(target.model_dump(), indent=2))
    else:
        print(
            f"{target.id} pool={target.pool} status={target.status.value} "
            f"label={target.label or '-'} {_placement_summary(target.metadata)}"
        )
    return 0


async def _run_list(args: argparse.Namespace) -> int:
    repos = await _open_global_repos()
    targets = await repos.compute_targets.list_all()
    if args.json:
        print(json.dumps([t.model_dump() for t in targets], indent=2))
        return 0
    if not targets:
        print("No compute targets registered.")
        return 0
    for target in targets:
        owner = (
            f" task={target.claimed_by_task_id}"
            if target.status == ComputeTargetStatus.CLAIMED
            and target.claimed_by_task_id is not None
            else ""
        )
        print(
            f"{target.id} pool={target.pool} status={target.status.value} "
            f"label={target.label or '-'} {_placement_summary(target.metadata)}{owner}"
        )
    return 0


def _placement_summary(metadata: dict[str, object]) -> str:
    cuda_visible_devices = metadata.get(CUDA_VISIBLE_DEVICES_METADATA_KEY)
    if isinstance(cuda_visible_devices, str) and cuda_visible_devices:
        return f"cuda={cuda_visible_devices}"
    if isinstance(cuda_visible_devices, int) and not isinstance(cuda_visible_devices, bool):
        return f"cuda={cuda_visible_devices}"
    return "cuda=-"


async def _run_remove(args: argparse.Namespace) -> int:
    repos = await _open_global_repos()
    target = await repos.compute_targets.get(target_id=args.target_id)
    if target is None:
        print(f"compute target not found: {args.target_id}")
        return 1
    if target.status == ComputeTargetStatus.CLAIMED and not args.force:
        print(
            f"compute target {target.id} is currently claimed by task "
            f"{target.claimed_by_task_id}; pass --force to remove anyway"
        )
        return 1
    if target.status == ComputeTargetStatus.CLAIMED:
        removed = await repos.compute_targets.drain(target_id=target.id)
        event_type = "compute_target.drained"
        message = f"Draining compute target {target.id}"
        action = "draining"
    else:
        removed = await repos.compute_targets.remove(target_id=target.id)
        event_type = "compute_target.removed"
        message = f"Removed compute target {target.id}"
        action = "removed"
    if removed is None:
        print(f"compute target not removed: {target.id}")
        return 1
    await repos.events.add(
        event_type=event_type,
        message=message,
        payload={
            "target_id": target.id,
            "pool": target.pool,
        },
    )
    if args.json:
        print(json.dumps({action: target.id}))
    else:
        print(f"{action} {target.id}")
    return 0

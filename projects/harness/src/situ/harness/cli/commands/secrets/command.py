from __future__ import annotations

import argparse
import getpass
import sys
from typing import Any, Literal

from ....config import LocalSecretStore
from ...headless._shared.output import write_json

SecretName = Literal["openai", "logfire"]

SECRET_LABELS: dict[SecretName, str] = {
    "openai": "OpenAI API key",
    "logfire": "Logfire token",
}


def run(args: argparse.Namespace) -> int:
    store = LocalSecretStore()
    command = getattr(args, "secrets_command", None)

    if command == "status":
        return status(store=store, as_json=bool(getattr(args, "json", False)))

    if command == "set":
        return set_secret(
            store=store,
            secret_name=args.secret_name,
            as_json=bool(getattr(args, "json", False)),
        )

    if command == "unset":
        return unset_secret(
            store=store,
            secret_name=args.secret_name,
            as_json=bool(getattr(args, "json", False)),
        )

    if command == "clear":
        return clear_secrets(store=store, as_json=bool(getattr(args, "json", False)))

    sys.stderr.write("unknown secrets command\n")
    return 2


def status(*, store: LocalSecretStore, as_json: bool) -> int:
    payload = status_payload(store=store)
    if as_json:
        write_json(payload)
        return 0

    sys.stdout.write(f"local secret store: {payload['path']}\n")
    sys.stdout.write(f"openai: {configured_label(payload['openai']['configured'])}\n")
    sys.stdout.write(f"logfire: {configured_label(payload['logfire']['configured'])}\n")
    return 0


def set_secret(
    *,
    store: LocalSecretStore,
    secret_name: SecretName,
    as_json: bool,
) -> int:
    label = SECRET_LABELS[secret_name]
    try:
        value = getpass.getpass(f"Enter local {label}: ")
    except KeyboardInterrupt:
        sys.stderr.write("\ninterrupted\n")
        return 130
    except EOFError:
        sys.stderr.write("no secret provided\n")
        return 1

    if not value.strip():
        sys.stderr.write(f"{label} cannot be empty; use `situ secrets unset {secret_name}` to remove it.\n")
        return 1

    if secret_name == "openai":
        store.set_openai_key(value)
    else:
        store.set_logfire_token(value)

    payload = mutation_payload(
        store=store,
        secret_name=secret_name,
        action="set",
        changed=True,
    )
    if as_json:
        write_json(payload)
    else:
        sys.stdout.write(f"saved local {label}\n")
    return 0


def unset_secret(
    *,
    store: LocalSecretStore,
    secret_name: SecretName,
    as_json: bool,
) -> int:
    if secret_name == "openai":
        changed = store.unset_openai_key()
    else:
        changed = store.unset_logfire_token()

    payload = mutation_payload(
        store=store,
        secret_name=secret_name,
        action="unset",
        changed=changed,
    )
    if as_json:
        write_json(payload)
    else:
        state = "removed" if changed else "already missing"
        sys.stdout.write(f"{state} local {SECRET_LABELS[secret_name]}\n")
    return 0


def clear_secrets(*, store: LocalSecretStore, as_json: bool) -> int:
    changed = store.clear()
    payload = {
        "action": "clear",
        "changed": changed,
        "path": str(store.path),
        "openai": secret_status(configured=False),
        "logfire": secret_status(configured=False),
    }
    if as_json:
        write_json(payload)
    else:
        state = "cleared" if changed else "already clear"
        sys.stdout.write(f"{state} local Situ runtime secrets\n")
    return 0


def status_payload(*, store: LocalSecretStore) -> dict[str, Any]:
    return {
        "path": str(store.path),
        "openai": secret_status(configured=store.get_openai_key() is not None),
        "logfire": secret_status(configured=store.get_logfire_token() is not None),
    }


def mutation_payload(
    *,
    store: LocalSecretStore,
    secret_name: SecretName,
    action: str,
    changed: bool,
) -> dict[str, Any]:
    payload = status_payload(store=store)
    payload.update(
        {
            "action": action,
            "changed": changed,
            "secret": secret_name,
        }
    )
    return payload


def secret_status(*, configured: bool) -> dict[str, Any]:
    return {
        "configured": configured,
        "source": "local" if configured else "missing",
    }


def configured_label(configured: object) -> str:
    return "configured" if configured else "missing"

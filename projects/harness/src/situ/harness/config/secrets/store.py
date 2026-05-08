from __future__ import annotations

import json
import asyncio
import os
from pathlib import Path
from typing import Any

import aiofiles
import aiofiles.os

from ..defaults import DEFAULTS

LOGFIRE_TOKEN_NAME = "logfire_token"
ANTHROPIC_KEY_NAME = "anthropic_key"


class LocalSecretStore:
    def __init__(self, home: Path | None = None) -> None:
        self.home = home.expanduser() if home is not None else DEFAULTS.local_state_home_path()
        self.path = self.home / "secrets.json"

    async def get_anthropic_key(self) -> str | None:
        return await self._get_secret(ANTHROPIC_KEY_NAME)

    async def set_anthropic_key(self, value: str) -> None:
        await self._set_secret(ANTHROPIC_KEY_NAME, value, label="Anthropic key")

    async def unset_anthropic_key(self) -> bool:
        return await self._unset_secret(ANTHROPIC_KEY_NAME)

    async def get_logfire_token(self) -> str | None:
        return await self._get_secret(LOGFIRE_TOKEN_NAME)

    async def set_logfire_token(self, value: str) -> None:
        await self._set_secret(LOGFIRE_TOKEN_NAME, value, label="Logfire token")

    async def unset_logfire_token(self) -> bool:
        return await self._unset_secret(LOGFIRE_TOKEN_NAME)

    async def clear(self) -> bool:
        try:
            await aiofiles.os.remove(self.path)
        except FileNotFoundError:
            return False
        return True

    async def _get_secret(self, name: str) -> str | None:
        value = (await self._read()).get(name)
        if not isinstance(value, str):
            return None
        stripped = value.strip()
        return stripped or None

    async def _set_secret(self, name: str, value: str, *, label: str) -> None:
        stripped = value.strip()
        if not stripped:
            raise ValueError(f"{label} cannot be empty.")
        secrets = await self._read()
        secrets[name] = stripped
        await self._write(secrets)

    async def _unset_secret(self, name: str) -> bool:
        secrets = await self._read()
        if name not in secrets:
            return False

        del secrets[name]
        if secrets:
            await self._write(secrets)
        else:
            await self.clear()
        return True

    async def _read(self) -> dict[str, Any]:
        try:
            async with aiofiles.open(self.path, encoding="utf-8") as file:
                raw = await file.read()
        except FileNotFoundError:
            return {}

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return {}

        return parsed if isinstance(parsed, dict) else {}

    async def _write(self, value: dict[str, Any]) -> None:
        await aiofiles.os.makedirs(self.home, exist_ok=True)
        try:
            await asyncio.to_thread(os.chmod, self.home, 0o700)
        except OSError:
            pass

        payload = json.dumps(value, indent=2, sort_keys=True) + "\n"
        async with aiofiles.open(self.path, "w", encoding="utf-8") as file:
            await file.write(payload)
        try:
            await asyncio.to_thread(os.chmod, self.path, 0o600)
        except OSError:
            pass

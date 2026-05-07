from __future__ import annotations

from collections.abc import Iterable
import re

RECORD_ID_PREFIXES = {
    "project": "P",
    "session": "S",
    "analysis": "A",
    "hypothesis": "H",
    "baseline": "B",
    "experiment": "EX",
    "evaluation": "EV",
    "measurement": "M",
    "artifact": "ART",
    "task": "T",
}


def canonical_record_id_number(*, record_id: str, prefix: str) -> int | None:
    match = re.fullmatch(rf"{re.escape(prefix)}(?P<number>[1-9]\d*)", record_id)
    if match is None:
        return None
    return int(match.group("number"))


def is_canonical_record_id(*, record_id: str, prefix: str) -> bool:
    return canonical_record_id_number(record_id=record_id, prefix=prefix) is not None


def ensure_canonical_record_id(*, record_id: str, prefix: str, noun: str) -> None:
    if not is_canonical_record_id(record_id=record_id, prefix=prefix):
        raise ValueError(
            f"{noun} id must use the {prefix}<N> form, got: {record_id}"
        )


def next_canonical_record_id(*, existing_ids: Iterable[str], prefix: str) -> str:
    largest_number = 0
    for record_id in existing_ids:
        largest_number = max(
            largest_number,
            canonical_record_id_number(record_id=record_id, prefix=prefix) or 0,
        )
    return f"{prefix}{largest_number + 1}"

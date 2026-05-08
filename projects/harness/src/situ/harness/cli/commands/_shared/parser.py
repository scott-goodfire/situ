from __future__ import annotations

import argparse
import difflib
import re
from typing import NoReturn


_INVALID_CHOICE = re.compile(r"invalid choice: '?([^'(]+?)'? \(choose from ([^)]+)\)")


class SituArgumentParser(argparse.ArgumentParser):
    def error(self, message: str) -> NoReturn:
        match = _INVALID_CHOICE.search(message)
        if match is not None:
            bad = match.group(1).strip()
            choices = [c.strip().strip("'\"") for c in match.group(2).split(",")]
            suggestions = difflib.get_close_matches(bad, choices, n=1, cutoff=0.6)
            if suggestions:
                message = f"{message}\n  Did you mean: {suggestions[0]}?"
        super().error(message)

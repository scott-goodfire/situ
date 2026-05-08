from __future__ import annotations

import re

# Token shape for FTS5 query normalization. Matches alphanumeric runs and
# preserves an optional trailing `*` so agents can request prefix matching
# (e.g. "latenc*" -> matches "latency", "latencies"). Other FTS5 metacharacters
# (`-`, `:`, `(`, `)`, etc.) are stripped by the tokenizer; agents pass natural
# keywords and the helper assembles a safe AND-of-tokens query.
_FTS_TOKEN = re.compile(r"[A-Za-z0-9_]+\*?")


def normalize_fts_query(query: str) -> str:
    """Normalize an agent-supplied search string into safe FTS5 syntax.

    Splits the query into alphanumeric tokens (preserving trailing `*` for
    prefix matching) and joins them with implicit AND. Each token is wrapped
    in double quotes so embedded FTS5 operators in adversarial input cannot
    change the parse. Returns an empty string if the query has no usable
    tokens; callers should treat that as "no results" rather than passing it
    to FTS5 (an empty MATCH expression is a SQL error).
    """
    tokens: list[str] = []
    for match in _FTS_TOKEN.finditer(query):
        token = match.group(0)
        if token.endswith("*"):
            stem = token[:-1]
            if stem:
                tokens.append(f'"{stem}"*')
        else:
            tokens.append(f'"{token}"')
    return " ".join(tokens)

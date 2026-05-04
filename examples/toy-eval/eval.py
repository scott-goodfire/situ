from __future__ import annotations

import json


def main() -> None:
    print(json.dumps({"score": 0.710, "latency_ms": 100}))


if __name__ == "__main__":
    main()

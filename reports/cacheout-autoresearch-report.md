# Cacheout Autoresearch Trial

Date: 2026-05-05

## Goal

Run Almanac against a normal open-source library where the objective is to
improve real implementation behavior, not to repair a benchmark framework.

The selected target was `dgilland/cacheout`, a Python in-memory caching library
with FIFO, LIFO, LRU, MRU, LFU, and random-replacement cache variants. This is a
better autoresearch target than the earlier `perftester` smoke test because the
project has real hot paths: cache `get`, `set`, eviction, TTL, memoization, and
statistics.

Sandbox location:

```sh
~/sandbox/cacheout-almanac-lab
```

## Setup

The target repo was cloned fresh:

```sh
git clone --depth=1 https://github.com/dgilland/cacheout.git ~/sandbox/cacheout-almanac-lab
cd ~/sandbox/cacheout-almanac-lab
uv venv
uv pip install -e '.[dev]'
```

The native correctness command was:

```sh
uv run pytest src/cacheout tests --cov=cacheout
```

Baseline result:

```text
113 passed
100.00% coverage
```

## Almanac Objective

```text
Improve cacheout hot-path cache operation performance while preserving public
API behavior and the existing 100 percent coverage test suite.
```

Context given to Almanac:

```text
This is a normal Python cache library, not a benchmark framework. Use
project-native commands. Correctness command: uv run pytest src/cacheout tests
--cov=cacheout. For performance evidence, use lightweight project-local
Python/timeit commands from the shell against Cache and LRUCache get/set hot
paths; preserve stdout/stderr as plaintext evaluation evidence. Compare
baseline and candidate timings. Prefer small implementation changes in
src/cacheout only. Do not edit tests or lower coverage. Treat test edits,
coverage changes, API changes, and correctness failures as suspicious.
```

Command:

```sh
uv run --package almanac-harness almanac exec ~/sandbox/cacheout-almanac-lab \
  --json \
  --objective "Improve cacheout hot-path cache operation performance while preserving public API behavior and the existing 100 percent coverage test suite." \
  --context "This is a normal Python cache library, not a benchmark framework. Use project-native commands. Correctness command: uv run pytest src/cacheout tests --cov=cacheout. For performance evidence, use lightweight project-local Python/timeit commands from the shell against Cache and LRUCache get/set hot paths; preserve stdout/stderr as plaintext evaluation evidence. Compare baseline and candidate timings. Prefer small implementation changes in src/cacheout only. Do not edit tests or lower coverage. Treat test edits, coverage changes, API changes, and correctness failures as suspicious." \
  --max-experiments 2 \
  --timeout 900
```

## Almanac Result

Almanac completed the session cleanly and closed `session_0001`.

It created:

- one hypothesis: reduce hot-path overhead in `Cache.set/get` internals
- two experiments:
  - inline no-TTL hit check and avoid delete miss on new set
  - avoid redundant lock and method dispatch in `LRUCache.get`
- three evaluations:
  - baseline correctness and hot-path timings
  - candidate timing for inline expiration and set miss avoidance
  - candidate timing for direct `LRUCache.get`

Almanac rejected one attempted direction internally: an inline `_get`
expiration optimization reduced coverage to `98.95%`, so the agent reverted it.
That is the right behavior for this product: the observability layer kept the
failed idea visible while preserving the correctness gate.

## Candidate Diff

The final target diff is source-only:

```text
src/cacheout/cache.py | 13 ++++++-------
src/cacheout/lru.py   |  2 +-
```

No tests were edited.

In `Cache._set`, the candidate avoids calling `_delete(key)` on new keys. The
old path always attempted `_delete(key)` after checking whether a key was new,
which meant new-key insertion paid a redundant deletion/miss path.

In `LRUCache.get`, the candidate calls `self._get(...)` under the existing lock
instead of `super().get(...)`, avoiding nested method/lock overhead while keeping
the LRU `move_to_end` behavior.

## Correctness Validation

I independently reran the native correctness command after Almanac finished:

```text
113 passed
100.00% coverage
```

The candidate preserved the public test suite and coverage gate.

## Performance Validation

Almanac's recorded baseline timings for 200k operations:

```text
Cache set     ~0.1099s
Cache get     ~0.0918s
LRUCache set  ~0.1094s
LRUCache get  ~0.1407s
```

Almanac's final candidate timings:

```text
Cache set     ~0.1023s
Cache get     ~0.0922s
LRUCache set  ~0.1062s
LRUCache get  ~0.1044s
```

I then ran an independent side-by-side benchmark using a clean `HEAD` export as
baseline and the current sandbox source as candidate. The benchmark used seven
repeats per case.

Baseline:

```text
Cache.get hit:       min=0.002927s median=0.003155s
LRUCache.get hit:    min=0.003184s median=0.003206s
Cache.set new 1k:    min=0.901047s median=0.909982s
LRUCache.set new 1k: min=0.913479s median=0.921785s
```

Candidate:

```text
Cache.get hit:       min=0.002914s median=0.003065s
LRUCache.get hit:    min=0.002905s median=0.002965s
Cache.set new 1k:    min=0.753491s median=0.760672s
LRUCache.set new 1k: min=0.753724s median=0.759817s
```

This confirms the strongest candidate result: new-key `set` throughput improved
materially. `LRUCache.get` also improved in the independent microbenchmark, but
the magnitude is smaller than the initial Almanac timing suggested.

## Current Sandbox State

The target repo is left dirty with the candidate changes:

```text
M src/cacheout/cache.py
M src/cacheout/lru.py
?? uv.lock
```

`uv.lock` was generated by the local setup, not by the source optimization.

## Product Findings

This is a much better autoresearch target than the earlier smoke test.

The run looked like the intended product loop:

```text
normal library baseline
  -> benchmark hot paths
  -> propose implementation hypothesis
  -> edit source only
  -> run correctness gate
  -> reject coverage-breaking idea
  -> keep source-only candidate
  -> record candidate timings
  -> close with findings and risks
```

What worked:

- Almanac used project-native tests.
- Almanac created evaluation records with plaintext evidence.
- Almanac edited only implementation files.
- Almanac treated lower coverage as a failed/suspicious direction.
- Almanac produced a useful finding: new-key insertion had avoidable deletion
  overhead.
- The session closed cleanly.

What still needs improvement:

- The benchmark harness was improvised by the agent. That is acceptable for MVP,
  but Almanac should eventually make repeated benchmark confirmation easier.
- The dirty `uv.lock` start was recorded correctly, but setup-generated files are
  noisy. We may want a documented sandbox setup convention for external repos.
- The second timing signal was directionally right but overestimated in the
  first run. Almanac should nudge toward repeated confirmation before calling a
  performance result strong.

## Recommendation

Use `cacheout` as the first real optimization demo target.

It is small, fast, and realistic. The result is easy to explain:

```text
Almanac found and validated a tiny hot-path optimization in a Python cache
library while preserving all tests and 100% coverage.
```

For the next run, I would give Almanac a budget of 4-6 experiments and ask it to
compare several focused directions:

- new-key `set` overhead
- LRU hit overhead
- bulk `set_many` overhead
- TTL expiration scanning
- callback/statistics overhead when disabled

That would start to look like a real autoresearch board of findings rather than
a single patch.

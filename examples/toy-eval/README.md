# Toy Eval

This example is intentionally deterministic. The harness uses the toy worker in
`workers/examples/toy_worker/worker.py` to simulate baseline results,
individual components, a combination, and one suspicious result.

It exists to prove the first vertical slice:

- sequential experiments
- result activities and signals
- lightweight hypothesis activity
- automated trust concerns
- live TUI observability

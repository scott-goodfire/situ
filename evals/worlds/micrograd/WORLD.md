# Micrograd Eval World

This world mocks a tiny autoresearch task inspired by the micrograd sandbox.

The world has a baseline, three simple variants, one promising combination, and
one suspicious result:

```text
baseline  score=0.710 latency=100
A         modest score improvement
B         slight score improvement with latency cost
C         stronger score improvement
A+C       best valid combination
bad       huge score jump with changed evidence shape and missing signals
```

The first evals do not mutate a real micrograd checkout. They simulate the
evidence Almanac would receive from a worker so we can evaluate planning,
tool-call order, suspicious-win handling, and finding synthesis quickly.


# Micrograd Sandbox

This is a tiny external-workspace smoke test for Almanac.

It does not ask Almanac to edit `micrograd` yet. Instead, the target repo gets a
small JSON eval script. Almanac runs its fixed baseline/A/B/C/A+C/bad proposal
sequence against that eval command, records evidence, extracts findings, and
flags suspicious output.

## Setup

```bash
mkdir -p ~/sandbox
cd ~/sandbox
git clone https://github.com/karpathy/micrograd.git micrograd-hillclimb
cd micrograd-hillclimb
python -m venv .venv
source .venv/bin/activate
pip install -e .
cp ~/autoresearch-harness/examples/micrograd-sandbox/almanac_eval.py ./almanac_eval.py
```

Check the eval directly:

```bash
python almanac_eval.py --json
ALMANAC_COMPONENTS_JSON='["A","C"]' python almanac_eval.py --json
```

## Run Almanac From The Harness Repo

```bash
cd ~/autoresearch-harness
mise run start -- ~/sandbox/micrograd-hillclimb \
  --eval-command "python almanac_eval.py --json" \
  --goal "Find which tiny micrograd training tweaks improve XOR accuracy without suspicious evidence." \
  --evaluation-context "Run a deterministic micrograd XOR eval that reports score, accuracy, loss, runtime_ms, and tests_passed as JSON." \
  --known-signal score \
  --known-signal accuracy \
  --known-signal loss \
  --known-signal runtime_ms \
  --known-signal tests_passed \
  --experiment-scope "Compare baseline, individual toy components, combinations, and one intentionally suspicious result."
```

## Run Almanac From The Sandbox Repo

After `mise run update` has created the harness virtualenv:

```bash
cd ~/sandbox/micrograd-hillclimb
~/autoresearch-harness/.venv/bin/almanac start . \
  --eval-command "python almanac_eval.py --json" \
  --goal "Find which tiny micrograd training tweaks improve XOR accuracy without suspicious evidence." \
  --evaluation-context "Run a deterministic micrograd XOR eval that reports score, accuracy, loss, runtime_ms, and tests_passed as JSON." \
  --known-signal score \
  --known-signal accuracy \
  --known-signal loss \
  --known-signal runtime_ms \
  --known-signal tests_passed \
  --experiment-scope "Compare baseline, individual toy components, combinations, and one intentionally suspicious result."
```

State is still written outside the sandbox repo under
`~/.almanac/projects/<project-id>/`.

# Micrograd Sandbox

This is a tiny external-workspace smoke test for Almanac.

It does not ask Almanac to edit `micrograd` yet. Instead, the target repo gets a
small JSON eval script. Almanac runs its fixed baseline/A/B/C/A+C/bad proposal
sequence against that eval command, records result activities, and flags
suspicious output as concerns.

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

For autoresearch-style candidate work, prefer an isolated branch instead of
running directly on `master` or `main`:

```bash
git checkout -b almanac/micrograd-smoke
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
  --objective "Find which tiny micrograd training tweaks improve XOR accuracy without suspicious results." \
  --context "Run /Users/scott-goodfire/sandbox/micrograd-hillclimb/.venv/bin/python almanac_eval.py --json for the deterministic micrograd XOR eval. Keep work on the almanac/micrograd-smoke branch, inspect workspace state before interpreting results, and flag changed tests, evals, dependencies, generated files, or changed test counts as comparability concerns."
```

## Run Almanac From The Sandbox Repo

After `mise run update` has created the harness virtualenv:

```bash
cd ~/sandbox/micrograd-hillclimb
~/autoresearch-harness/.venv/bin/almanac start . \
  --objective "Find which tiny micrograd training tweaks improve XOR accuracy without suspicious results." \
  --context "Run .venv/bin/python almanac_eval.py --json for the deterministic micrograd XOR eval. Keep work on an almanac/... branch, inspect workspace state before interpreting results, and flag changed tests, evals, dependencies, generated files, or changed test counts as comparability concerns."
```

State is still written outside the sandbox repo under
`~/.almanac/projects/<project-id>/`.

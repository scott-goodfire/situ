# Micrograd Sandbox

This is a tiny external-workspace smoke test for Situ.

It does not ask Situ to edit `micrograd` yet. Instead, the target repo gets a
small JSON eval script. Situ runs its fixed baseline/A/B/C/A+C/bad proposal
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
cp ~/autoresearch-harness/examples/micrograd-sandbox/situ_eval.py ./situ_eval.py
```

For autoresearch-style candidate work, prefer an isolated branch instead of
running directly on `master` or `main`:

```bash
git checkout -b situ/micrograd-smoke
```

Check the eval directly:

```bash
python situ_eval.py --json
SITU_COMPONENTS_JSON='["A","C"]' python situ_eval.py --json
```

## Run Situ From The Harness Repo

```bash
cd ~/autoresearch-harness
mise run start -- ~/sandbox/micrograd-hillclimb \
  --objective "Find which tiny micrograd training tweaks improve XOR accuracy without suspicious results." \
  --context "Run /Users/scott-goodfire/sandbox/micrograd-hillclimb/.venv/bin/python situ_eval.py --json for the deterministic micrograd XOR eval. Keep work on the situ/micrograd-smoke branch, inspect workspace state before interpreting results, and flag changed tests, evals, dependencies, generated files, or changed test counts as comparability concerns."
```

## Run Situ From The Sandbox Repo

After `mise run update` has created the harness virtualenv:

```bash
cd ~/sandbox/micrograd-hillclimb
~/autoresearch-harness/.venv/bin/situ start . \
  --objective "Find which tiny micrograd training tweaks improve XOR accuracy without suspicious results." \
  --context "Run .venv/bin/python situ_eval.py --json for the deterministic micrograd XOR eval. Keep work on a situ/... branch, inspect workspace state before interpreting results, and flag changed tests, evals, dependencies, generated files, or changed test counts as comparability concerns."
```

State is still written outside the sandbox repo under
`~/.situ/projects/<project-id>/`.

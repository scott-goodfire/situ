#!/usr/bin/env bash
# Print the bottom-N least-covered source files across all .coverage/**/lcov.info
# files. Mirrors how we use fallow's prioritized output: surface the next thing
# worth testing without gating CI on a magic threshold.
#
# Usage: bash scripts/coverage-summary.sh [N]   (default N=20)

set -e
limit="${1:-20}"

shopt -s nullglob
files=(.coverage/*/lcov.info)
if [ ${#files[@]} -eq 0 ]; then
  echo "No coverage reports found under .coverage/*/lcov.info."
  echo "Run 'mise run coverage:app' or 'mise run coverage:web' first."
  exit 1
fi

# lcov files concatenate multiple records per source file when a file is
# exercised by more than one test group. Take the highest LH observed per
# file (LF should be constant — same source has same instrumentable lines).
awk '
  /^SF:/ { file = substr($0, 4) }
  /^LF:/ { lf = substr($0, 4) + 0 }
  /^LH:/ { lh = substr($0, 4) + 0 }
  /^end_of_record/ {
    if (lf > 0 && (!(file in best_lh) || lh > best_lh[file])) {
      best_lh[file] = lh
      best_lf[file] = lf
    }
    file = ""; lf = 0; lh = 0
  }
  END {
    for (f in best_lh) {
      pct = (best_lh[f] / best_lf[f]) * 100
      printf "%6.1f%%  %5d/%-5d  %s\n", pct, best_lh[f], best_lf[f], f
    }
  }
' "${files[@]}" \
  | sort -n \
  | head -n "$limit"

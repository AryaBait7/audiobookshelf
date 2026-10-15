#!/usr/bin/env bash
# Runs every per-session gate from the plan (session-01/migration.md §7) and prints a summary.
# Usage: bash agentic-ai/workflow-b/tools/gate.sh <NN> <base-rev> <converted .js path>...
#   <base-rev>: a commit holding the original JS of the converted files; use the baseline 513a0679
#   (HEAD only works for files first converted in the current session)
# Logs go to ../migration-evidence/workflow-b/session-logs/sNN-*.
set -u
NN="$1"; BASE="$2"; shift 2
WT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$WT"
L="$WT/../migration-evidence/workflow-b/session-logs"
mkdir -p "$L/s$NN-smoke"
T="agentic-ai/workflow-b/tools"
S="$L/s$NN-gate-summary.txt"
: > "$S"
say() { echo "$*" | tee -a "$S"; }

npm run clean:ts > /dev/null 2>&1
npm run build:server > "$L/s$NN-build.log" 2>&1; say "build_exit: $?"
npm run typecheck > "$L/s$NN-typecheck.log" 2>&1; TC=$?
say "typecheck_exit: $TC errors: $(grep -cE 'error TS[0-9]+' "$L/s$NN-typecheck.log")"
npm run clean:ts > /dev/null 2>&1   # test run must rebuild via pretest
npm test > "$L/s$NN-npm-test.log" 2>&1; say "npm_test_exit: $?"
say "passing: $(grep -oE '[0-9]+ passing' "$L/s$NN-npm-test.log" | tail -1 | grep -oE '[0-9]+' || echo 0)  failing: $(grep -oE '[0-9]+ failing' "$L/s$NN-npm-test.log" | tail -1 | grep -oE '[0-9]+' || echo 0)  pending: $(grep -oE '[0-9]+ pending' "$L/s$NN-npm-test.log" | tail -1 | grep -oE '[0-9]+' || echo 0)"
grep -E '✔|✓' "$L/s$NN-npm-test.log" | sed -E 's/\s*\([0-9]+ms\)$//; s/^\s+//' | sort > "$L/s$NN-passing-titles.txt"
MISSING=$(comm -23 "$WT/../migration-evidence/baseline/measure-wt-b/tests-passing-titles.txt" "$L/s$NN-passing-titles.txt" | wc -l)
say "baseline_titles_missing: $MISSING"
if [ $# -gt 0 ]; then
  node "$T/export-shape.js" "$BASE" "$@" > "$L/s$NN-export-shape.log" 2>&1; ES=$?; say "$(tail -1 "$L/s$NN-export-shape.log") (exit $ES); differing: $(grep -E "^DIFF" "$L/s$NN-export-shape.log" | cut -c7- | paste -sd' ' -)"
  node "$T/emit-diff.js" "$BASE" "$@" > "$L/s$NN-emit-diff.log" 2>&1; say "$(tail -1 "$L/s$NN-emit-diff.log" | cut -d'(' -f1)"
fi
bash "$T/strict-check.sh" "$L/s$NN-strict.log" > /dev/null 2>&1
tail -6 "$L/s$NN-strict.log" | tee -a "$S"
npm run clean:ts > /dev/null 2>&1   # smoke must rebuild via prestart
timeout 200 bash "$WT/../migration-evidence/scripts/smoke.sh" "$WT" "$L/s$NN-smoke" > "$L/s$NN-smoke/smoke-summary.txt" 2>&1
say "$(grep -E 'smoke_pass' "$L/s$NN-smoke/smoke-summary.txt") $(grep -E 'server_log_error_lines' "$L/s$NN-smoke/smoke-summary.txt")"
npm run build:server > /dev/null 2>&1

#!/usr/bin/env bash
# Informational strict check of every .ts file in scope, with the same compiler options as
# measure.sh's "reference_strict" check and the pinned reference tsc (../migration-evidence/tools).
# Also counts forbidden directives and `any` in the converted files.
# Usage: bash agentic-ai/workflow-b/tools/strict-check.sh [logfile]
set -u
WT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$WT"
TSC="$WT/../migration-evidence/tools/node_modules/.bin/tsc"
WTM="$(cygpath -m "$WT" 2>/dev/null || echo "$WT")"
LOG="${1:-/dev/stdout}"
TSFILES=$( (git ls-files --cached --others --exclude-standard -- 'server/' 'index.ts' 'prod.ts') | grep -v '^server/libs/' | grep -E '\.ts$' | grep -vE '\.d\.ts$' | while read -r f; do [ -f "$f" ] && echo "$f"; done)
CFG="$(mktemp -d)/strict.json"
INC=$(echo "$TSFILES" | sed "s#^#\"$WTM/#; s#\$#\"#" | paste -sd, -)
cat > "$CFG" <<EOF
{
  "compilerOptions": {
    "strict": true, "noEmit": true, "allowJs": true, "checkJs": false,
    "module": "nodenext", "moduleResolution": "nodenext", "target": "es2022",
    "esModuleInterop": true, "resolveJsonModule": true, "skipLibCheck": true,
    "types": ["node"], "typeRoots": ["$WTM/node_modules/@types"]
  },
  "files": [ $INC ]
}
EOF
"$TSC" -p "$CFG" --pretty false > "$LOG.tmp" 2>&1
ALL=$(grep -cE 'error TS[0-9]+' "$LOG.tmp")
FP=$(grep -E 'error TS[0-9]+' "$LOG.tmp" | grep -vE '(server/libs/|node_modules/|^test/|/test/)' | wc -l)
OWN=$(for f in $TSFILES; do grep -E "^$f\(" "$LOG.tmp"; done | wc -l)
cnt() { echo "$TSFILES" | xargs grep -oE "$1" 2>/dev/null | wc -l; }
{
  cat "$LOG.tmp"
  echo "ts_files: $(echo "$TSFILES" | grep -c .)"
  echo "strict_errors_total: $ALL first_party: $FP in_converted_ts_files: $OWN"
  echo "directives (@ts-ignore/@ts-nocheck/@ts-expect-error): $(cnt '@ts-(ignore|nocheck|expect-error)')"
  echo "explicit_any: $(cnt '(:\s*any\b|<any>|\bany\[\]|\bas any\b)')"
  echo "as_unknown_as: $(cnt '\bas unknown as\b')"
  echo "non_null_assertions: $(cnt '[A-Za-z0-9_\)\]]!\.')"
} > "$LOG"
rm -f "$LOG.tmp"
[ "$LOG" != /dev/stdout ] && tail -6 "$LOG"

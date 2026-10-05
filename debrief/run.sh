#!/usr/bin/env bash
# Post-GGIR INT activity reports (bahaa pipeline debrief).
# Production home: LSS tools/pipeline/debrief (not a Cursor-only path).
# Dry-run default. --apply writes; --land lands PDF in BOOST-I/auto/.
# Auto-fitness ON by default (REDCap Targeting + HR xlsx). PDF = reportlab only.
#
#   bahaa pipeline debrief
#   bahaa pipeline debrief --apply --land
#   bahaa pipeline debrief --ids 8080 --apply --land --force
#   bahaa pipeline debrief --no-auto-fitness   # skip REDCap/xlsx join
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${DEBRIEF_ENABLE:-1}" == "0" ]]; then
  echo "DEBRIEF_ENABLE=0 - skipping debrief"
  exit 0
fi

# Prefer bundled LSS copy (vosslink production). Optional HBC override via HBC_ROOT.
BATCH_PY="${SCRIPT_DIR}/batch_debrief.py"
if [[ -n "${HBC_ROOT:-}" && -f "${HBC_ROOT}/repos/boost-report-plots/debrief/batch_debrief.py" ]]; then
  BATCH_PY="${HBC_ROOT}/repos/boost-report-plots/debrief/batch_debrief.py"
fi

[[ -f "${BATCH_PY}" ]] || {
  echo "Missing batch_debrief.py under ${SCRIPT_DIR} (sync debrief package)" >&2
  exit 1
}

# shellcheck disable=SC1090
source "${CONDA_SH}"
set +u
conda activate "${GGIR_CONDA_ENV}"
set -u

echo "debrief using ${BATCH_PY}"
python "${BATCH_PY}" "$@"

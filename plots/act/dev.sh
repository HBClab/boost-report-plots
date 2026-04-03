#!/usr/bin/env bash
# Start the act-plots dev server with the correct DB socket path.
# Run from anywhere inside the repo — this script resolves the repo root automatically.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SOCKET_DIR="${REPO_ROOT}/.local"
PORT="${DB_PORT:-55432}"
DB_NAME="${DB_NAME:-boost_actigraphy}"

export ACTIGRAPHY_DB_URL="postgresql://localhost/${DB_NAME}?host=${SOCKET_DIR}&port=${PORT}"

echo "DB socket: ${SOCKET_DIR}"
echo "Starting dev server → http://localhost:3000"
echo ""

cd "${SCRIPT_DIR}"
exec npm run dev

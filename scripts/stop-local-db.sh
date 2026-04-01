#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGDATA_DIR="${ROOT_DIR}/.local/pgdata"

if [[ ! -d "${PGDATA_DIR}" ]]; then
  echo "No local PostgreSQL data directory found at ${PGDATA_DIR}"
  exit 0
fi

if pg_ctl -D "${PGDATA_DIR}" status >/dev/null 2>&1; then
  echo "Stopping local PostgreSQL"
  pg_ctl -D "${PGDATA_DIR}" -m fast stop
else
  echo "Local PostgreSQL is not running"
fi

#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /path/to/backup.dump" >&2
  exit 1
fi

DUMP_FILE="$1"

if [[ ! -f "${DUMP_FILE}" ]]; then
  echo "Backup file not found: ${DUMP_FILE}" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_DIR="${ROOT_DIR}/.local"
SOCKET_DIR="${LOCAL_DIR}"
PORT="${PORT:-55432}"
DB_NAME="${DB_NAME:-boost_actigraphy}"

if ! pg_ctl -D "${LOCAL_DIR}/pgdata" status >/dev/null 2>&1; then
  echo "Local PostgreSQL is not running. Start it first with scripts/start-local-db.sh" >&2
  exit 1
fi

if psql -h "${SOCKET_DIR}" -p "${PORT}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  echo "Dropping existing database ${DB_NAME}"
  dropdb -h "${SOCKET_DIR}" -p "${PORT}" "${DB_NAME}"
fi

echo "Creating database ${DB_NAME}"
createdb -h "${SOCKET_DIR}" -p "${PORT}" "${DB_NAME}"

echo "Restoring ${DUMP_FILE} into ${DB_NAME}"
pg_restore \
  -h "${SOCKET_DIR}" \
  -p "${PORT}" \
  -d "${DB_NAME}" \
  --clean \
  --if-exists \
  "${DUMP_FILE}"

echo "Restore complete"
